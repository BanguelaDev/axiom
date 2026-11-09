import { isRunningInExpoGo } from 'expo';
import { supportsNativeAudioControls } from '@axiom/core/playback';

// O serviço de reprodução é instalado pelo config plugin no binário próprio.
// Expo Go não recebe a configuração nativa do projeto.
export const nativeAudioControls = supportsNativeAudioControls(
  process.env.EXPO_OS || 'web',
  isRunningInExpoGo(),
);
