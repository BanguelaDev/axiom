import { networkInterfaces } from 'node:os';
import { setTimeout } from 'node:timers';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { startLocalApi } from '../packages/backend/local-server.ts';
const lan = process.argv.includes('--lan');
const addresses = Object.entries(networkInterfaces())
  .filter(([name]) => !/virtual|vbox|vmware|loopback|wsl|hyper-v/i.test(name))
  .flatMap(([, items]) => items || [])
  .filter((item) => item.family === 'IPv4' && !item.internal);
const address = lan
  ? addresses.find((item) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address))
      ?.address
  : '127.0.0.1';
if (!address)
  throw new Error(
    'Não encontramos um IP da rede local. Conecte o computador e o celular ao mesmo Wi-Fi.',
  );
const url = `http://${address}:8787`;
const server = await startLocalApi(8787, {
  host: lan ? '0.0.0.0' : '127.0.0.1',
  publicUrl: url,
  generation:
    process.env.AXIOM_LOCAL_GENERATION !== 'false' && !!process.env.GEMINI_API_KEY?.trim(),
});
console.log(`AXIOM · API ${url} · RSS + Gemini Free Tier, sem fallback pago.`);
if (lan)
  console.log(
    `Celular: mesma rede do computador. Use o QR code do Expo. A API só permanece disponível com este terminal aberto.`,
  );
const expoEnv = {
  ...process.env,
  EXPO_PUBLIC_LOCAL_API_URL: url,
  EXPO_PUBLIC_SUPABASE_URL: '',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
  BROWSER: 'none',
};
for (const key of [
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'GNEWS_API_KEY',
  'ELEVENLABS_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TRIGGER_SECRET_KEY',
])
  delete (expoEnv as Record<string, string | undefined>)[key];
const expo = spawn(
  process.execPath,
  [
    resolve('node_modules/expo/bin/cli'),
    'start',
    '--web',
    '--port',
    '8081',
    '--host',
    lan ? 'lan' : 'localhost',
  ],
  { cwd: resolve('apps/mobile'), env: expoEnv, stdio: 'inherit', windowsHide: true },
);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  expo.kill();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000);
}
expo.on('exit', stop);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, stop);
