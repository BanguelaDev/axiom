import { View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import type { PublicEpisode } from '@axiom/core/api';
import { getEpisode, isId } from '@axiom/core/podcast';
import { backendConnection } from '@/services/backend';
import { router, useLocalSearchParams } from 'expo-router';
import { getTopic } from '@axiom/core/topics';
import { Screen, Copy, Icon, Button, Notice } from '@/components/ui';
import { spacing } from '@/theme';
export default function SourcesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = getTopic(id || '');
  if (isId(id)) return <EpisodeSources id={id} />;
  return (
    <Screen>
      <View style={{ gap: spacing.lg, paddingVertical: spacing.xl }}>
        <Icon name="text-box-search-outline" symbol="doc.text.magnifyingglass" size={48} />
        <Copy variant="title">As fontes vêm junto com a informação.</Copy>
        <Copy tone="secondary">
          Quando os episódios de {topic?.name || 'notícias'} forem gerados, esta tela mostrará os
          veículos, as datas e os links das matérias utilizadas.
        </Copy>
      </View>
      <Notice>
        A amostra do player não utiliza matérias jornalísticas. Não há fontes de notícias para
        exibir nesta demonstração.
      </Notice>
      {topic ? (
        <Button
          title="Voltar ao player"
          onPress={() => router.replace({ pathname: '/episode/[id]', params: { id: topic.id } })}
        />
      ) : null}
      <Button title="Voltar aos temas" secondary onPress={() => router.replace('/')} />
    </Screen>
  );
}
function EpisodeSources({ id }: { id: string }) {
  const [episode, setEpisode] = useState<PublicEpisode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!backendConnection) return;
    void getEpisode(backendConnection, id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setEpisode(value);
          setError(null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            'As referências deste episódio estão indisponíveis. A edição pode ter expirado ou sido retirada.',
          );
      });
    return () => controller.abort();
  }, [id, attempt]);
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        INFORMAÇÃO COM ORIGEM
      </Copy>
      <Copy variant="title">Leia além dos dois minutos.</Copy>
      {!episode && !error ? (
        <ActivityIndicator accessibilityLabel="Carregando referências" />
      ) : null}
      {episode ? (
        <>
          <Copy tone="secondary">{episode.title}</Copy>
          <Copy variant="caption" tone="muted">
            Edição de {new Date(episode.generatedAt).toLocaleString('pt-BR')}
          </Copy>
          {episode.sources.map((source) => (
            <View key={source.url} style={{ gap: spacing.md, paddingVertical: spacing.md }}>
              <Copy variant="eyebrow" tone="accent">
                {source.publisher}
              </Copy>
              <Copy variant="headline">{source.title}</Copy>
              <Copy variant="caption" tone="muted">
                Publicado em {new Date(source.publishedAt).toLocaleString('pt-BR')}
              </Copy>
              <Button
                title={`Ler matéria em ${source.publisher}`}
                secondary
                onPress={() => {
                  void Linking.openURL(source.url).catch(() =>
                    setError('Não foi possível abrir o link. Tente novamente.'),
                  );
                }}
              />
            </View>
          ))}
          <Notice>
            As matérias foram publicadas nas 72 horas anteriores à geração desta edição. Os textos
            completos e o roteiro não são exibidos pelo AXIOM.
          </Notice>
        </>
      ) : null}
      {error ? (
        <>
          <Copy tone="notice" accessibilityRole="alert">
            {error}
          </Copy>
          <Button
            title="Consultar fontes novamente"
            secondary
            onPress={() => setAttempt((n) => n + 1)}
          />
        </>
      ) : null}
      <Button title="Voltar ao podcast" onPress={() => router.back()} />
      <Button title="Voltar aos temas" secondary onPress={() => router.replace('/')} />
    </Screen>
  );
}
