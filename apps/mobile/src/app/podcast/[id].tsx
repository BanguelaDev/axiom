import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getTopic } from '@axiom/core/topics';
import { usePodcast } from '@/state/podcast-state';
import { useApp } from '@/state/app-state';
import { Screen, Copy, Button, Notice, Icon } from '@/components/ui';
import { AudioProgress } from '@/components/audio-progress';
import { radius, sizes, spacing } from '@/theme';
const time = (n: number) =>
  `${Math.floor(Math.max(0, n) / 60)}:${String(Math.floor(Math.max(0, n)) % 60).padStart(2, '0')}`;
export default function PodcastScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { episode, openEpisode, loading, audioError, status, starting, toggle, seek, history } =
    usePodcast();
  const { colors, topicColors } = useApp();
  useEffect(() => {
    if (id) void openEpisode(id);
  }, [id, openEpisode]);
  const selected = episode?.id === id ? episode : null;
  const topic = selected ? getTopic(selected.topicId) : null;
  const disabled = loading || !status.isLoaded || starting || !!audioError;
  return (
    <Screen>
      {loading ? (
        <ActivityIndicator color={colors.accent} accessibilityLabel="Carregando episódio" />
      ) : null}
      {selected && topic ? (
        <>
          <View style={{ alignItems: 'center', gap: spacing.lg }}>
            <Copy variant="eyebrow" style={{ color: topicColors[topic.id] }}>
              {topic.name}
            </Copy>
            <View
              style={{
                width: sizes.artwork,
                height: sizes.artwork,
                borderRadius: radius.lg,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.lg,
              }}
            >
              <Icon
                name={topic.icon}
                symbol={topic.symbol}
                size={sizes.largeIcon}
                color={topicColors[topic.id]}
              />
              <Copy variant="eyebrow" tone="muted">
                AXIOM
              </Copy>
            </View>
            <Copy variant="title" style={{ textAlign: 'center' }}>
              {selected.title}
            </Copy>
            <Copy variant="caption" tone="secondary">
              {new Date(selected.generatedAt).toLocaleString('pt-BR')} · Narração por IA
            </Copy>
          </View>
          <AudioProgress
            position={status.currentTime}
            duration={status.duration || selected.durationSeconds}
            disabled={disabled}
            onSeek={seek}
            testID="podcast-progress"
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Copy variant="caption" tone="muted">
              {time(status.currentTime)}
            </Copy>
            <Copy variant="caption" tone="muted">
              {time(Math.round(status.duration || selected.durationSeconds))}
            </Copy>
          </View>
          <Button
            title={
              status.playing
                ? 'Pausar podcast'
                : history.some((item) => item.id === selected.id && item.position > 0)
                  ? 'Continuar podcast'
                  : 'Ouvir podcast'
            }
            disabled={disabled}
            loading={starting}
            onPress={() => void toggle()}
          />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              title="Voltar 15 s"
              secondary
              disabled={disabled}
              onPress={() => void seek(status.currentTime - 15)}
              style={{ flex: 1 }}
            />
            <Button
              title="Avançar 15 s"
              secondary
              disabled={disabled}
              onPress={() => void seek(status.currentTime + 15)}
              style={{ flex: 1 }}
            />
          </View>
          <Button
            title="Fontes deste episódio"
            secondary
            onPress={() => router.push({ pathname: '/sources/[id]', params: { id: selected.id } })}
          />
          <Notice>
            Resumo e voz gerados por inteligência artificial. Consulte as matérias originais para
            conhecer os detalhes. A edição corresponde à data de geração.
          </Notice>
        </>
      ) : null}
      {audioError ? (
        <>
          <Copy variant="headline">Não conseguimos abrir o áudio.</Copy>
          <Copy tone="notice" accessibilityRole="alert">
            {audioError}
          </Copy>
          <Button title="Renovar acesso ao áudio" onPress={() => void openEpisode(id, true)} />
        </>
      ) : null}
      <Button title="Voltar aos temas" secondary onPress={() => router.replace('/')} />
    </Screen>
  );
}
