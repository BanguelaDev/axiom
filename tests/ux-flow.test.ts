import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  demoGenerationReducer as reduce,
  initialDemoGeneration as initial,
  demoStages,
  type DemoScenario,
} from '../packages/core/src/demo-generation.ts';
import {
  parsePreferences,
  clampPosition,
  resumePosition,
  updateHistoryPosition,
} from '../packages/core/src/listening.ts';

for (const scenario of ['ready', 'empty', 'error'] as DemoScenario[]) {
  test(`o protótipo termina no cenário ${scenario} sem tocar áudio ou criar notícias`, () => {
    let state = reduce(initial, { type: 'start', topicId: 'ai', scenario });
    for (let step = 0; step < demoStages.length; step++) {
      assert.equal(state.status, 'preparing');
      assert.equal(state.step, step);
      state = reduce(state, { type: 'advance', requestId: state.requestId });
    }
    assert.equal(state.status, scenario);
    assert.equal(state.topicId, 'ai');
  });
}
test('cancelar impede a conclusão e uma tentativa anterior não altera a nova', () => {
  const started = reduce(initial, { type: 'start', topicId: 'ai', scenario: 'ready' });
  const cancelled = reduce(started, { type: 'cancel', requestId: started.requestId });
  assert.equal(reduce(cancelled, { type: 'advance', requestId: started.requestId }), cancelled);
  const retried = reduce(cancelled, { type: 'start', topicId: 'crime', scenario: 'empty' });
  assert.equal(reduce(retried, { type: 'advance', requestId: started.requestId }), retried);
  assert.equal(reduce(retried, { type: 'cancel', requestId: started.requestId }), retried);
});
test('preferências corrompidas não quebram o histórico e entradas desconhecidas são descartadas', () => {
  assert.deepEqual(parsePreferences(null), { themePreference: 'dark', history: [] });
  const parsed = parsePreferences(
    JSON.stringify({
      themePreference: 'light',
      history: [
        null,
        { topicId: 'unknown', playedAt: '2026-11-08', position: 0 },
        { topicId: 'ai', playedAt: 'inválido', position: 3 },
        { topicId: 'ai', playedAt: '2026-11-08T12:00:00Z', position: 6 },
        { topicId: 'ai', playedAt: '2026-11-08T11:00:00Z', position: 2 },
        { topicId: 'crime', playedAt: '2026-11-08T12:00:00Z', position: -10 },
      ],
    }),
  );
  assert.equal(parsed.themePreference, 'light');
  assert.equal(parsed.history.length, 2);
  assert.equal(parsed.history[0]!.position, 6);
  assert.equal(parsed.history[1]!.position, 0);
  assert.throws(() => parsePreferences('{inválido')); // O provider exibe falha de leitura e permite recuperar.
});
test('retomada reinicia somente no fim; progresso não sai dos limites nem mistura temas', () => {
  assert.equal(clampPosition(Infinity), 0);
  assert.equal(clampPosition(40), 12);
  assert.equal(resumePosition(6, 12), 6);
  assert.equal(resumePosition(12, 12), 0);
  const items = [{ topicId: 'ai' as const, playedAt: '2026-11-08T12:00:00Z', position: 5 }];
  assert.equal(updateHistoryPosition(items, 'crime', 10), items);
  assert.equal(updateHistoryPosition(items, 'ai', 5), items);
  assert.equal(updateHistoryPosition(items, 'ai', 8)[0]!.position, 8);
});
