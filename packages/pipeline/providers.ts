export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`Configure ${name} no .env local. Não envie chaves ao app ou ao GitHub.`);
  return value;
}
export async function synthesize(text: string): Promise<Uint8Array> {
  const voiceId = requireEnv('ELEVENLABS_VOICE_ID');
  if (!/^[a-zA-Z0-9_-]+$/.test(voiceId)) throw new Error('Identificador de voz inválido.');
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': requireEnv('ELEVENLABS_API_KEY'),
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
        voice_settings: { stability: 0.65, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(120000),
    },
  );
  if (!response.ok || !response.headers.get('content-type')?.includes('audio'))
    throw new Error(`Não foi possível gerar a voz (HTTP ${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}
