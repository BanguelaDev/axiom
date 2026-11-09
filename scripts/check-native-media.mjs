import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const mode = process.argv[2] || 'background';
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8' });
function status() {
  const dump = adb('shell', 'dumpsys', 'media_session');
  const start = dump.indexOf('package=br.com.axiom.mobile');
  assert.ok(start >= 0, 'AXIOM precisa ter uma MediaSession nativa.');
  const own = dump.slice(start);
  const match = /state=PlaybackState\s*\{state=(\d+),\s*position=(\d+)/.exec(own);
  assert.ok(match, 'MediaSession deve informar estado e posição.');
  assert.equal(Number(match[1]), 3, 'Áudio deve continuar tocando.');
  return { position: Number(match[2]), dump };
}
await mkdir('work/native-evidence', { recursive: true });
const first = status();
await new Promise((resolve) => setTimeout(resolve, 4000));
const second = status();
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
      foregroundService: true,
    },
    null,
    2,
  ),
);
await writeFile(`work/native-evidence/${mode}-media.txt`, second.dump);
await writeFile(`work/native-evidence/${mode}-services.txt`, services);
console.log(`Áudio nativo conferido: ${mode}, posição ${first.position} → ${second.position}.`);
