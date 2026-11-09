import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const mode = process.argv[2] || 'background';
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8' });
function status(label) {
  const dump = adb('shell', 'dumpsys', 'media_session');
  writeFileSync(`work/native-evidence/${mode}-${label}-media.txt`, dump);
  const sessions = [
    ...dump.matchAll(/package=br\.com\.axiom\.mobile\b([\s\S]*?)(?=\n {0,4}\S|$)/g),
  ].map((match) => match[0]);
  assert.ok(sessions.length, 'AXIOM precisa ter uma MediaSession nativa.');
  const own = sessions.find((session) =>
    /state=PlaybackState\s*\{state=(?:PLAYING\()?3\)?,/.test(session),
  );
  assert.ok(own, 'A sessão de mídia do podcast precisa estar tocando.');
  const match = /state=PlaybackState\s*\{state=(?:[A-Z_]+\()?(\d+)\)?,\s*position=(\d+)/.exec(own);
  assert.ok(match, 'MediaSession deve informar estado e posição.');
  assert.equal(Number(match[1]), 3, 'Áudio deve continuar tocando.');
  const updated = /updated=(\d+)/.exec(own),
    speed = /speed=([\d.]+)/.exec(own);
  assert.ok(updated && speed, 'Android precisa informar o relógio e o ritmo da posição.');
  const elapsed = Number(adb('shell', 'cat', '/proc/uptime').trim().split(/\s+/)[0]) * 1000;
  assert.ok(Number.isFinite(elapsed) && elapsed >= Number(updated[1]));
  assert.ok(Number(speed[1]) > 0);
  // PlaybackState informa uma posição-base e o instante monotônico da atualização.
  // https://developer.android.com/reference/android/media/session/PlaybackState#getLastPositionUpdateTime()
  const position = Number(match[2]) + (elapsed - Number(updated[1])) * Number(speed[1]);
  const audio = adb('shell', 'dumpsys', 'audio');
  writeFileSync(`work/native-evidence/${mode}-${label}-audio.txt`, audio);
  const uid = /uid:(\d+)/.exec(
    adb('shell', 'cmd', 'package', 'list', 'packages', '-U', 'br.com.axiom.mobile'),
  )?.[1];
  assert.ok(uid, 'O processo do AXIOM precisa estar identificado.');
  assert.match(
    audio,
    new RegExp(`(?:u/pid|uid/pid):\\s*${uid}/\\d+[^\\n]*state:\\s*started`, 'i'),
    'O Android precisa informar uma saída de áudio iniciada para o AXIOM.',
  );
  return { position, basePosition: Number(match[2]), updated: Number(updated[1]), elapsed, dump };
}
await mkdir('work/native-evidence', { recursive: true });
const first = status('first');
await new Promise((resolve) => setTimeout(resolve, 4000));
const second = status('second');
assert.ok(second.position > first.position, 'A posição precisa avançar fora da tela do app.');
const services = adb('shell', 'dumpsys', 'activity', 'services', 'br.com.axiom.mobile');
assert.match(services, /AudioControlsService/);
assert.match(services, /isForeground=true/);
const power = adb('shell', 'dumpsys', 'power');
if (mode === 'locked') assert.match(power, /mWakefulness=(Asleep|Dozing)/);
await writeFile(
  `work/native-evidence/${mode}.json`,
  JSON.stringify(
    {
      mode,
      playing: true,
      firstPosition: first.position,
      secondPosition: second.position,
      firstBasePosition: first.basePosition,
      secondBasePosition: second.basePosition,
      positionBasis:
        'PlaybackState position + elapsed real time; AudioTrack STARTED verificado nas duas amostras',
      foregroundService: true,
    },
    null,
    2,
  ),
);
await writeFile(`work/native-evidence/${mode}-media.txt`, second.dump);
await writeFile(`work/native-evidence/${mode}-services.txt`, services);
console.log(`Áudio nativo conferido: ${mode}, posição ${first.position} → ${second.position}.`);
