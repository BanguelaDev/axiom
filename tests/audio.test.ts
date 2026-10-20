import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ffmpeg } from '../packages/pipeline/binaries.ts';
import { measureDuration, finalizeAudio } from '../packages/pipeline/audio.ts';
test('FFmpeg prepara um arquivo real de dois minutos sem corte ou silêncio artificial', async () => {
  assert.ok(ffmpeg, 'FFmpeg precisa estar instalado para validar a etapa de áudio.');
  const directory = await mkdtemp(join(tmpdir(), 'axiom-audio-'));
  try {
    const input = join(directory, 'input.wav');
    const output = join(directory, 'output.mp3');
    await promisify(execFile)(ffmpeg, [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=122',
      input,
    ]);
    assert.ok(Math.abs((await measureDuration(input)) - 122) < 0.1);
    const duration = await finalizeAudio(input, output);
    assert.ok(Math.abs(duration - 120) <= 1);
  } finally {
    const target = resolve(directory);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('axiom-audio-'))
      throw new Error('Diretório temporário fora do destino esperado.');
    await rm(target, { recursive: true, force: true });
  }
});
