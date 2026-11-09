import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Copy, Button, Notice } from '@/components/ui';
import { useApp } from '@/state/app-state';
import { getLocalServerUrl, setLocalServerUrl, localServerEnabled } from '@/services/backend';
import { radius, spacing } from '@/theme';

export default function ConnectionScreen() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const [value, setValue] = useState(url || getLocalServerUrl() || '');
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const { colors } = useApp();
  async function connect() {
    setBusy(true);
    setError(null);
    try {
      await setLocalServerUrl(value);
      router.replace('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível conectar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        NA MESMA REDE
      </Copy>
      <Copy variant="title">Conecte ao seu computador.</Copy>
      <Copy tone="secondary">
        O computador prepara os podcasts e guarda os áudios. Mantenha o servidor ligado e use o
        mesmo Wi-Fi nos dois aparelhos.
      </Copy>
      <View style={{ gap: spacing.sm }}>
        <Copy variant="headline">Endereço do servidor</Copy>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="http://192.168.1.10:8787"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel="Endereço do servidor"
          testID="server-url-input"
          editable={!busy}
          style={{
            minHeight: 52,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.text,
            backgroundColor: colors.surface,
            fontSize: 16,
          }}
        />
        <Copy variant="caption" tone="muted">
          Use o endereço exibido pelo servidor no computador. A conexão é salva neste aparelho.
        </Copy>
      </View>
      {error ? (
        <Copy tone="notice" accessibilityRole="alert">
          {error}
        </Copy>
      ) : null}
      <Button
        title="Conectar"
        onPress={() => void connect()}
        loading={busy}
        disabled={!value.trim() || !localServerEnabled}
      />
      <Button
        title="Explorar a apresentação"
        secondary
        onPress={() => router.replace('/prototype')}
      />
      <Notice>
        A chave de inteligência artificial fica somente no computador. Você não precisa informar
        chaves neste aplicativo.
      </Notice>
    </Screen>
  );
}
