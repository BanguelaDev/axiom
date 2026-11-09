import { z } from 'zod';
import { EditorialFault, type EditorialModel } from './editorial.ts';
import { editorialOperations, editorialBoundary } from './editorial-prompts.ts';
import { AudioFault } from './audio.ts';
import type { VoiceProvider } from './elevenlabs.ts';

export interface GeminiOptions {
  key: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}
const endpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const textModel = 'gemini-3.8-flash',
  voiceModel = 'gemini-3.8-flash-tts';
interface Part {
  type?: string;
  text?: string;
  data?: string;
  mime_type?: string;
}
interface Interaction {
  status?: string;
  steps?: { type?: string; content?: Part[] }[];
  usage?: { total_input_tokens?: number; total_output_tokens?: number };
}
export class GeminiQuotaFault extends Error {
  constructor() {
    super(
      'A cota gratuita da IA foi atingida. Aguarde a renovação e tente novamente. Nenhum serviço pago será usado.',
    );
  }
}
async function interact(
  options: GeminiOptions,
  body: Record<string, unknown>,
  limit: number,
): Promise<Interaction> {
  if (!options.key.trim()) throw new Error('Configure GEMINI_API_KEY no servidor.');
  const timeout = AbortSignal.timeout(150_000);
  const response = await (options.fetch || fetch)(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': options.key,
      'Api-Revision': '2026-05-20',
    },
    body: JSON.stringify({ ...body, store: false, stream: false }),
    signal: options.signal ? AbortSignal.any([timeout, options.signal]) : timeout,
  });
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 429) throw new GeminiQuotaFault();
    throw new Error('O serviço gratuito está indisponível para esta conta.');
  }
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('Resposta acima do limite.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = Buffer.concat(chunks).toString('utf8');
  const result = JSON.parse(data) as Interaction;
  if (
    result.status !== 'completed' ||
    !Array.isArray(result.steps) ||
    result.steps.some((step) => !['model_output', 'thought'].includes(step.type || ''))
  )
    throw new Error('Resposta incompleta.');
  return result;
}
const parts = (result: Interaction) =>
  result
    .steps!.filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content || []);
/** Modelos com faixa gratuita; nenhuma seleção automática de fornecedor pago. */
export function createGeminiEditorialModel(options: GeminiOptions): EditorialModel {
  return editorialOperations(async (schema, _name, instructions, input) => {
    try {
      const jsonSchema = z.toJSONSchema(schema);
      delete jsonSchema.$schema;
      const result = await interact(
        options,
        {
          model: textModel,
          system_instruction: `${editorialBoundary}\n${instructions}`,
          input: JSON.stringify(input),
          response_format: { type: 'text', mime_type: 'application/json', schema: jsonSchema },
        },
        2 * 1024 * 1024,
      );
      const content = parts(result);
      if (
        !content.length ||
        content.some((part) => part.type !== 'text' || typeof part.text !== 'string')
      )
        throw new EditorialFault('incomplete_model');
      const value = schema.parse(JSON.parse(content.map((part) => part.text).join('')));
      return {
        value,
        usage:
          result.usage &&
          Number.isFinite(result.usage.total_input_tokens) &&
          Number.isFinite(result.usage.total_output_tokens)
            ? {
                inputTokens: result.usage.total_input_tokens!,
                outputTokens: result.usage.total_output_tokens!,
              }
            : null,
      };
    } catch (error) {
      if (error instanceof GeminiQuotaFault || error instanceof EditorialFault) throw error;
      throw new EditorialFault('model_unavailable');
    }
  });
}
export function createGeminiVoice(options: GeminiOptions): VoiceProvider {
  return {
    identity: `gemini:${voiceModel}:Kore:wav:pt-BR:v1`,
    async synthesize(text) {
      if (!text.trim() || text.length > 6000) throw new AudioFault('invalid_audio');
      try {
        const result = await interact(
          options,
          {
            model: voiceModel,
            input: [
              {
                type: 'user_input',
                content: [
                  {
                    type: 'text',
                    text,
                    annotations: [
                      {
                        type: 'speech_metadata',
                        style:
                          'Read the exact text in Brazilian Portuguese. Clear, calm news narration, comfortable steady pace around 130 words per minute. Do not add an introduction, music, effects or commentary.',
                      },
                    ],
                  },
                ],
              },
            ],
            response_format: { type: 'audio', mime_type: 'audio/wav', sample_rate: 24000 },
            generation_config: { speech_config: [{ voice: 'Kore' }] },
          },
          24 * 1024 * 1024,
        );
        const content = parts(result).filter((part) => part.type === 'audio');
        if (
          content.length !== 1 ||
          content[0]!.mime_type !== 'audio/wav' ||
          typeof content[0]!.data !== 'string'
        )
          throw new AudioFault('invalid_audio');
        const encoded = content[0]!.data!;
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0)
          throw new AudioFault('invalid_audio');
        const bytes = Buffer.from(encoded, 'base64');
        if (
          bytes.length < 44 ||
          bytes.length > 16 * 1024 * 1024 ||
          bytes.toString('ascii', 0, 4) !== 'RIFF' ||
          bytes.toString('ascii', 8, 12) !== 'WAVE'
        )
          throw new AudioFault('invalid_audio');
        return bytes;
      } catch (error) {
        if (error instanceof GeminiQuotaFault || error instanceof AudioFault) throw error;
        throw new AudioFault('voice_unavailable');
      }
    },
  };
}
