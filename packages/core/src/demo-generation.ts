import type { TopicId } from './topics.ts';

// Estado exclusivo do protótipo de UX. Não chama notícias, LLM ou síntese de voz.
export type DemoScenario = 'ready' | 'empty' | 'error';
export const demoStages = [
  { title: 'Abrindo o tema', description: 'Organizando a apresentação do assunto escolhido.' },
  { title: 'Preparando a experiência', description: 'Montando o fluxo de demonstração do AXIOM.' },
  { title: 'Separando a amostra', description: 'A amostra sonora já está incluída no aplicativo.' },
] as const;
export type DemoGeneration = {
  requestId: number;
  topicId: TopicId | null;
  scenario: DemoScenario;
  status: 'idle' | 'preparing' | 'ready' | 'empty' | 'error' | 'cancelled';
  step: number;
};
export const initialDemoGeneration: DemoGeneration = {
  requestId: 0,
  topicId: null,
  scenario: 'ready',
  status: 'idle',
  step: 0,
};
export type DemoAction =
  | { type: 'start'; topicId: TopicId; scenario: DemoScenario }
  | { type: 'advance'; requestId: number }
  | { type: 'cancel'; requestId: number };

export function demoGenerationReducer(state: DemoGeneration, action: DemoAction): DemoGeneration {
  if (action.type === 'start') {
    return {
      requestId: state.requestId + 1,
      topicId: action.topicId,
      scenario: action.scenario,
      status: 'preparing',
      step: 0,
    };
  }
  // Uma resposta antiga nunca deve concluir uma nova solicitação nem reabrir uma cancelada.
  if (action.requestId !== state.requestId || state.status !== 'preparing') return state;
  if (action.type === 'cancel') return { ...state, status: 'cancelled' };
  if (state.step < demoStages.length - 1) return { ...state, step: state.step + 1 };
  return { ...state, status: state.scenario };
}

export function isDemoScenario(value: unknown): value is DemoScenario {
  return value === 'ready' || value === 'empty' || value === 'error';
}
