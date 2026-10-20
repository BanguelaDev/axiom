import { mkdir, writeFile } from 'node:fs/promises';
// Sinal original de teste, sem direitos de terceiros e sem simular uma narração jornalística.
const sampleRate = 16000;
const duration = 12;
const dataSize = sampleRate * duration * 2;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write('RIFF');
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);
const notes = [261.63, 329.63, 392, 523.25];
for (let i = 0; i < sampleRate * duration; i++) {
  const time = i / sampleRate;
  const envelope = Math.sin((Math.PI * (time % 3)) / 3) ** 2;
  const note = notes[Math.floor(time / 3)]!;
  const sample =
    (Math.sin(2 * Math.PI * note * time) + 0.35 * Math.sin(2 * Math.PI * note * 1.5 * time)) *
    0.12 *
    envelope;
  buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
}
const directory = 'apps/mobile/assets/audio';
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/player-test.wav`, buffer);
console.log('Amostra original de 12 segundos criada. Não contém notícias nem voz.');
