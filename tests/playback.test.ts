import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  audioProgress,
  secondsFromProgress,
  supportsNativeAudioControls,
} from '../packages/core/src/playback.ts';

test('progresso converte segundos e fração sem sair dos limites do áudio', () => {
  assert.equal(audioProgress(30, 120).fraction, 0.25);
  assert.equal(secondsFromProgress(0.5, 120), 60);
  assert.equal(audioProgress(300, 120).fraction, 1);
  assert.equal(audioProgress(-10, 120).fraction, 0);
  assert.equal(secondsFromProgress(2, 120), 120);
  assert.equal(secondsFromProgress(NaN, 120), 0);
  assert.deepEqual(audioProgress(10, 0), { seconds: 0, duration: 0, fraction: 0 });
  assert.deepEqual(audioProgress(NaN, NaN), { seconds: 0, duration: 0, fraction: 0 });
});
test('serviço de controles só é ativado no binário nativo próprio', () => {
  for (const platform of ['android', 'ios']) {
    assert.equal(supportsNativeAudioControls(platform, true), false);
    assert.equal(supportsNativeAudioControls(platform, false), true);
  }
  assert.equal(supportsNativeAudioControls('web', false), false);
  assert.equal(supportsNativeAudioControls('unknown', false), false);
});
