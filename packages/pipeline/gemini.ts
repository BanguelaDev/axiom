import { z } from 'zod';
import {
  EditorialFault,
  numbersAreSupported,
  type EditorialModel,
  type EditorialInput,
} from './editorial.ts';
import { factsSchema, draftSchema } from './editorial-schema.ts';
import type { DraftInput } from './editorial.ts';
import { fitDraftBudget } from './draft-budget.ts';
import { editorialOperations, editorialBoundary } from './editorial-prompts.ts';
import { AudioFault } from './audio.ts';
import type { VoiceProvider } from './elevenlabs.ts';

export interface GeminiOptions {
  key: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
  onResult?(stage: string, value: unknown): Promise<void>;
  onUsage?(
    model: string,
    usage: { inputTokens: number | null; outputTokens: number | null },
  ): Promise<void>;
}
const endpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const textModel = 'gemini-3.5-flash-lite',
  voiceModel = 'gemini-3.8-flash-lite-tts';
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
export class GeminiAccessFault extends Error {
  constructor(public readonly status: number) {
    super('O serviço gratuito está indisponível para esta conta.');
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
    throw new GeminiAccessFault(response.status);
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
  const input = result.usage?.total_input_tokens,
    output = result.usage?.total_output_tokens;
  await options.onUsage?.(String(body.model), {
    inputTokens:
      typeof input === 'number' && Number.isSafeInteger(input) && input >= 0 ? input : null,
    outputTokens:
      typeof output === 'number' && Number.isSafeInteger(output) && output >= 0 ? output : null,
  });
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
export function geminiEvidence(input: EditorialInput) {
  const units: { unitId: string; articleId: string; text: string }[] = [];
  for (const [articleIndex, article] of input.articles.entries()) {
    let offset = 0,
      index = 0;
    while (offset < article.content.length) {
      let end = Math.min(offset + 900, article.content.length);
      if (end < article.content.length) {
        const space = article.content.lastIndexOf(' ', end);
        if (space > offset + 100) end = space;
      }
      const text = article.content.slice(offset, end).trim();
      if (text.length >= 25)
        units.push({ unitId: `a${articleIndex + 1}_u${++index}`, articleId: article.id, text });
      offset = end;
      while (article.content[offset] === ' ') offset++;
    }
  }
  return units;
}
/** Modelos com faixa gratuita; nenhuma seleção automática de fornecedor pago. */
export function createGeminiEditorialModel(options: GeminiOptions): EditorialModel {
  return editorialOperations(async (schema, _name, instructions, input) => {
    try {
      const extraction = _name === 'axiom_facts';
      const sourceInput = input as EditorialInput;
      const units = extraction ? geminiEvidence(sourceInput) : [];
      if (extraction && !units.length) throw new EditorialFault('invalid_evidence');
      const extractionSchema = factsSchema.extend({
        facts: z
          .array(
            factsSchema.shape.facts.element.extend({
              evidence: z
                .array(
                  z.strictObject({
                    unitId: z.enum(units.map((item) => item.unitId) as [string, ...string[]]),
                  }),
                )
                .min(1)
                .max(4),
            }),
          )
          .max(12),
      });
      const wireSchema = extraction ? extractionSchema : schema;
      const jsonSchema = z.toJSONSchema(wireSchema);
      delete jsonSchema.$schema;
      const payload = extraction
        ? {
            ...sourceInput,
            articles: sourceInput.articles.map(({ content: _content, ...metadata }) => metadata),
            evidenceUnits: units,
          }
        : input;
      const result = await interact(
        options,
        {
          model: textModel,
          system_instruction: `${editorialBoundary}\n${instructions}${extraction ? ' Em evidence, selecione somente unitId do catálogo evidenceUnits que sustente integralmente o fato. O servidor recupera o trecho literal; não escreva nem traduza citações. Os fatos devem estar em português brasileiro. Cada número em dígitos de statement deve existir literalmente no texto das unidades selecionadas, com a mesma grafia. Não acrescente o ano atual, datas da publicação ou números de metadados se não estiverem nesses trechos. Não converta datas relativas em datas absolutas. Prefira frases concisas com os detalhes diretamente sustentados. Use fontes de pelo menos dois grupos editoriais distintos.' : ''}`,
          input: JSON.stringify(payload),
          response_format: { type: 'text', mime_type: 'application/json', schema: jsonSchema },
          generation_config: { max_output_tokens: 6000 },
        },
        2 * 1024 * 1024,
      );
      const content = parts(result);
      if (
        !content.length ||
        content.some((part) => part.type !== 'text' || typeof part.text !== 'string')
      )
        throw new EditorialFault('incomplete_model');
      const raw = wireSchema.parse(JSON.parse(content.map((part) => part.text).join('')));
      let value: unknown = raw;
      if (extraction) {
        const chosen = extractionSchema.parse(raw),
          byId = new Map(units.map((unit) => [unit.unitId, unit]));
        const grounded = factsSchema.parse({
          ...chosen,
          facts: chosen.facts.map((fact) => ({
            ...fact,
            evidence: fact.evidence.map((evidence) => {
              const unit = byId.get(evidence.unitId);
              if (!unit) throw new EditorialFault('invalid_evidence');
              return { articleId: unit.articleId, quote: unit.text };
            }),
          })),
        });
        // Descartar um fato inválido mantém o restante da extração aproveitável.
        // As validações de conteúdo suficiente, origens e revisão continuam obrigatórias.
        const usable = grounded.facts.filter((fact) =>
          numbersAreSupported(fact.statement, fact.evidence.map((item) => item.quote).join(' ')),
        );
        await options.onResult?.('axiom_extraction_audit', {
          received: grounded.facts.length,
          discarded: grounded.facts
            .filter((fact) => !usable.includes(fact))
            .map((fact) => ({ id: fact.id, reason: 'unsupported_number' })),
        });
        value = {
          ...grounded,
          sufficient: grounded.sufficient && usable.length >= 2,
          facts: usable,
        };
      }
      if (_name === 'axiom_draft') {
        const draft = draftSchema.parse(value);
        const facts = new Map((input as DraftInput).facts.facts.map((fact) => [fact.id, fact]));
        value = {
          ...draft,
          claims: draft.claims.map((claim) => {
            const missing = [
              ...new Set(
                claim.factIds.flatMap((id) => {
                  const fact = facts.get(id);
                  return fact &&
                    fact.kind !== 'confirmed' &&
                    fact.attribution &&
                    !claim.narration.includes(fact.attribution)
                    ? [fact.attribution]
                    : [];
                }),
              ),
            ];
            // Completar somente créditos já vinculados aos fatos. A revisão avalia a versão final.
            return missing.length
              ? { ...claim, narration: `Segundo ${missing.join(' e ')}, ${claim.narration}` }
              : claim;
          }),
        };
        value = fitDraftBudget(draftSchema.parse(value), input as DraftInput);
      }
      await options.onResult?.(_name, value);
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
      if (
        error instanceof GeminiQuotaFault ||
        error instanceof GeminiAccessFault ||
        error instanceof EditorialFault
      )
        throw error;
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
        if (
          error instanceof GeminiQuotaFault ||
          error instanceof GeminiAccessFault ||
          error instanceof AudioFault
        )
          throw error;
        throw new AudioFault('voice_unavailable');
      }
    },
  };
}
