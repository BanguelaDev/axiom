import { useState } from 'react';
import { View } from 'react-native';
import { Picker } from '@expo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { requestApi } from '@axiom/core/api-client';
import { parseFeedback, type EpisodeFeedback } from '@axiom/core/feedback';
import { isId } from '@axiom/core/podcast';
import { backendConnection } from '@/services/backend';
import { Screen, Copy, Button, Notice } from '@/components/ui';
import { ControlsHost } from '@/components/controls-host';
import { spacing } from '@/theme';

export default function FeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [connection] = useState(() => backendConnection);
  const [clarity, setClarity] = useState(''),
    [naturalness, setNaturalness] = useState('');
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function send(value: EpisodeFeedback) {
    if (!connection || !isId(id) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestApi(connection, `/episodes/${id}/feedback`, undefined, {
        method: 'POST',
        body: parseFeedback(value),
      });
      setSent(true);
    } catch {
      setError('Não foi possível enviar. Confira a conexão e se o episódio ainda está disponível.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        SUA ESCUTA AJUDA
      </Copy>
      <Copy variant="title">Como foi este episódio?</Copy>
      {sent ? (
        <>
          <Copy variant="headline">Recebemos sua avaliação.</Copy>
          <Copy tone="secondary">
            Ela ficará no servidor do projeto para revisão pelo responsável.
          </Copy>
        </>
      ) : (
        <>
          <Copy tone="secondary">
            Dê notas de 1 a 5. Uma nota maior indica uma voz mais clara ou natural.
          </Copy>
          {[
            { label: 'Clareza da voz', value: clarity, change: setClarity },
            { label: 'Naturalidade da voz', value: naturalness, change: setNaturalness },
          ].map((item) => (
            <View key={item.label} style={{ gap: spacing.sm }}>
              <Copy variant="headline">{item.label}</Copy>
              <ControlsHost>
                <Picker selectedValue={item.value} onValueChange={item.change} testID={item.label}>
                  <Picker.Item label="Escolha uma nota" value="" />
                  {['1', '2', '3', '4', '5'].map((n) => (
                    <Picker.Item key={n} label={`${item.label}: nota ${n}`} value={n} />
                  ))}
                </Picker>
              </ControlsHost>
            </View>
          ))}
          <Button
            title="Enviar avaliação da voz"
            disabled={!connection || busy || !clarity || !naturalness}
            loading={busy}
            onPress={() =>
              void send({
                kind: 'voice-rating',
                clarity: Number(clarity),
                naturalness: Number(naturalness),
              })
            }
          />
          <Copy variant="headline">Encontrou um problema?</Copy>
          <Copy tone="secondary">
            Escolha o que precisa de revisão. O relato será vinculado a este episódio; não informe
            dados pessoais.
          </Copy>
          {(
            [
              { kind: 'content', label: 'Possível erro na notícia' },
              { kind: 'audio', label: 'Problema no áudio' },
              { kind: 'sources', label: 'Problema nas fontes' },
            ] as const
          ).map((item) => (
            <Button
              key={item.kind}
              title={item.label}
              secondary
              disabled={!connection || busy}
              onPress={() => void send({ kind: item.kind })}
            />
          ))}
          {error ? (
            <Copy tone="notice" accessibilityRole="alert">
              {error}
            </Copy>
          ) : null}
          <Notice>
            A avaliação não retira o episódio automaticamente. O responsável revisa os relatos no
            computador. Não coletamos nome, e-mail ou texto livre.
          </Notice>
        </>
      )}
      <Button
        title="Voltar ao episódio"
        secondary
        onPress={() => router.replace({ pathname: '/podcast/[id]', params: { id } })}
      />
    </Screen>
  );
}
