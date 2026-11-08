import { Host } from '@expo/ui';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { useApp } from '@/state/app-state';
import { sizes } from '@/theme';

export function ControlsHost({ children }: { children: ReactNode }) {
  const { scheme, colors } = useApp();
  // Na prévia web, explicitar os tokens impede que o tema escuro do navegador
  // seja herdado por um controle que o usuário escolheu exibir em tema claro.
  const webVariables =
    process.env.EXPO_OS === 'web'
      ? {
          '--expo-ui-background': colors.surface,
          '--expo-ui-foreground': colors.text,
          '--expo-ui-gray-900': colors.text,
          '--expo-ui-gray-500': colors.muted,
          '--expo-ui-gray-200': colors.line,
          colorScheme: scheme,
        }
      : {};
  return (
    <Host
      matchContents
      colorScheme={scheme}
      seedColor={colors.accent}
      style={
        {
          width: '100%',
          minHeight: sizes.touch,
          justifyContent: 'center',
          ...webVariables,
        } as ViewStyle
      }
    >
      {children}
    </Host>
  );
}
