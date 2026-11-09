import QRCode from 'qrcode';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { lanAddress } from '../packages/backend/lan-address.ts';
import { apiVersion } from '../packages/core/src/api.ts';

const address = lanAddress();
const web = `http://${address}:8081`;
const api = `http://${address}:8787`;
const uri = `exp://${address}:8081`;
const [health, manifest] = await Promise.all([
  fetch(`${api}/health`, { signal: AbortSignal.timeout(8000) }),
  fetch(web, {
    headers: { 'expo-platform': 'android', Accept: 'application/expo+json,application/json' },
    signal: AbortSignal.timeout(30000),
  }),
]);
if (!health.ok || !manifest.ok) throw new Error('Inicie npm run dev:lan antes de gerar o QR code.');
const status = await health.json(),
  data = await manifest.json();
if (status.version !== apiVersion || !data.launchAsset?.url)
  throw new Error('O servidor ou o manifesto Android não está disponível.');
const directory = resolve('work', 'android-preview');
await mkdir(directory, { recursive: true });
await QRCode.toFile(resolve(directory, 'expo-go.png'), uri, {
  width: 360,
  margin: 4,
  errorCorrectionLevel: 'M',
});
await writeFile(
  resolve(directory, 'connection.json'),
  JSON.stringify({ web, api, expoGo: uri, sdk: data.extra?.expoClient?.sdkVersion }, null, 2),
);
console.log(`Android: abra o Expo Go e escaneie work/android-preview/expo-go.png.`);
console.log(`Endereço para digitar no Expo Go: ${uri}`);
console.log(`Prévia pelo navegador do celular: ${web}`);
