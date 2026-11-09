import { AudioFault } from './audio.ts';
export interface VoiceOptions {
  key: string;
  voiceId: string;
  model?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}
export interface VoiceProvider {
  identity: string;
  synthesize(text: string): Promise<Uint8Array>;
}
export function createElevenLabsVoice(options: VoiceOptions): VoiceProvider {
  const model = options.model || 'eleven_multilingual_v2';
  if (
    !options.key.trim() ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(options.voiceId) ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(model)
  )
    throw new AudioFault('voice_configuration');
  return {
    identity: `elevenlabs:${options.voiceId}:${model}:mp3_44100_128:stability0.65:similarity0.75`,
    async synthesize(text) {
      if (!text.trim() || text.length > 6000) throw new AudioFault('invalid_audio');
      try {
        const response = await (options.fetch || fetch)(
          `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}?output_format=mp3_44100_128`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'xi-api-key': options.key },
            body: JSON.stringify({
              text,
              model_id: model,
              voice_settings: { stability: 0.65, similarity_boost: 0.75 },
            }),
            signal: options.signal
              ? AbortSignal.any([AbortSignal.timeout(120_000), options.signal])
              : AbortSignal.timeout(120_000),
          },
        );
        if (!response.ok) {
          await response.body?.cancel();
          throw new AudioFault(
            [402, 429].includes(response.status) ? 'voice_quota' : 'voice_unavailable',
          );
        }
        if (
          !response.headers.get('content-type')?.toLowerCase().startsWith('audio/mpeg') ||
          Number(response.headers.get('content-length')) > 10 * 1024 * 1024
        ) {
          await response.body?.cancel();
          throw new AudioFault('invalid_audio');
        }
        const reader = response.body?.getReader();
        if (!reader) throw new AudioFault('invalid_audio');
        let size = 0;
        const chunks: Uint8Array[] = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 10 * 1024 * 1024) {
              await reader.cancel();
              throw new AudioFault('invalid_audio');
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        if (!size) throw new AudioFault('invalid_audio');
        const audio = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          audio.set(chunk, offset);
          offset += chunk.length;
        }
        return audio;
      } catch (error) {
        if (error instanceof AudioFault) throw error;
        throw new AudioFault('voice_unavailable');
      }
    },
  };
}
