import { View } from 'react-native';
import { Host, Picker } from '@expo/ui';
import { Copy, Screen, Button, Notice } from '@/components/ui';
import { useApp, type ThemePreference } from '@/state/app-state';
import { spacing } from '@/theme';
export default function SettingsScreen() {
  const {
    scheme,
    colors,
    themePreference,
    setThemePreference,
    clearHistory,
    storageError,
    history,
  } = useApp();
  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <Copy variant="eyebrow" tone="accent">
          DO SEU JEITO
        </Copy>
        <Copy variant="title">Uma pausa para ajustar.</Copy>
        <Copy tone="secondary">Pequenas escolhas para uma escuta mais confortável.</Copy>
      </View>
      <View
        style={{
          gap: spacing.md,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        }}
      >
        <Copy variant="headline">Aparência</Copy>
        <Copy variant="caption" tone="muted">
          Escolha o visual ou acompanhe o tema do aparelho.
        </Copy>
        <Host matchContents colorScheme={scheme} seedColor={colors.accent}>
          <Picker<ThemePreference>
            selectedValue={themePreference}
            onValueChange={setThemePreference}
            testID="theme-picker"
          >
            <Picker.Item label="Escuro" value="dark" />
            <Picker.Item label="Claro" value="light" />
            <Picker.Item label="Acompanhar o sistema" value="system" />
          </Picker>
        </Host>
      </View>
      <View
        style={{
          gap: spacing.md,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        }}
      >
        <Copy variant="headline">Seus dados</Copy>
        <Copy tone="secondary">
          As preferências e o histórico desta demonstração ficam somente neste aparelho.
        </Copy>
        <Button
          title="Limpar histórico de escuta"
          secondary
          disabled={!history.length}
          onPress={clearHistory}
        />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Copy variant="headline">Sobre o AXIOM</Copy>
        <Copy tone="secondary">
          Projeto de Programação para Dispositivos Móveis da AEMS. TADS, 6º período, Três Lagoas.
        </Copy>
        <Copy variant="caption" tone="muted">
          Professor Bruno · Versão 0.1.0
        </Copy>
      </View>
      <Notice>
        Versão inicial para explorar a experiência. A coleta de notícias e a voz final ainda estão
        em validação. Nenhuma notícia é gerada nesta demonstração.
      </Notice>
      {storageError ? <Copy tone="notice">{storageError}</Copy> : null}
    </Screen>
  );
}
