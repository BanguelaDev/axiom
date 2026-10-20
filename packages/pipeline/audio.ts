import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ffmpeg, ffprobe } from './binaries.ts';
const execute = promisify(execFile);
export async function measureDuration(file: string): Promise<number> {
  const { stdout } = await execute(ffprobe.path, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  const duration = Number(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Áudio inválido ou vazio.');
  return duration;
}
export function correctionRatio(duration: number): number | null {
  const ratio = duration / 120;
  return ratio >= 0.97 && ratio <= 1.03 ? ratio : null;
}
export async function finalizeAudio(input: string, output: string): Promise<number> {
  if (!ffmpeg) throw new Error('FFmpeg indisponível nesta plataforma.');
  const duration = await measureDuration(input);
  const ratio = correctionRatio(duration);
  if (ratio === null)
    throw new Error('O roteiro precisa ser refeito: duração fora da margem de ajuste natural.');
  await execute(ffmpeg, [
    '-y',
    '-i',
    input,
    '-vn',
    '-af',
    `atempo=${ratio},loudnorm=I=-16:TP=-1.5:LRA=11`,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '128k',
    output,
  ]);
  const finalDuration = await measureDuration(output);
  if (Math.abs(finalDuration - 120) > 1)
    throw new Error('O áudio final não atende à duração de dois minutos.');
  return finalDuration;
}
