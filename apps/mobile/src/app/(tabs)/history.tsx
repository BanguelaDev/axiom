import { View, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { getTopic } from '@axiom/core/topics';
import { Screen, Copy, Icon, Button } from '@/components/ui';
import { useApp } from '@/state/app-state';
import { spacing } from '@/theme';
import { resumePosition, DEMO_DURATION } from '@axiom/core/listening';
import { usePodcast } from '@/state/podcast-state';
export default function HistoryScreen() {
  const { history, hydrated, colors, topicColors } = useApp();
  const podcast = usePodcast();
  if (!hydrated || !podcast.hydrated)
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Carregando histórico" />
      </Screen>
    );
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        SUA ESCUTA, NO SEU RITMO
      </Copy>
      <Copy variant="title">Um assunto pode{'\n'}levar a outro.</Copy>
      {podcast.history.length ? (
        <>
          <Copy variant="headline">Seus podcasts</Copy>
          <Copy tone="secondary">
            A data identifica a edição. O áudio é conferido no servidor antes de abrir; episódios
            expirados ou retirados podem ficar indisponíveis.
          </Copy>
          {podcast.history.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir episódio ${item.title}`}
              onPress={() => router.push({ pathname: '/podcast/[id]', params: { id: item.id } })}
              style={({ pressed }) => ({
                paddingVertical: spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                gap: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Copy variant="eyebrow" tone="accent">
                {getTopic(item.topicId)?.name}
              </Copy>
              <Copy variant="headline">{item.title}</Copy>
              <Copy variant="caption" tone="muted">
                {new Date(item.generatedAt).toLocaleDateString('pt-BR')} ·{' '}
                {Math.round(item.duration)} segundos ·{' '}
                {item.position >= item.duration - 0.25
                  ? 'Ouvido'
                  : `Continuar em ${Math.floor(item.position)}s`}
              </Copy>
            </Pressable>
          ))}
        </>
      ) : null}
      {history.length ? (
        <>
          <Copy tone="secondary">Suas amostras de teste ficam salvas neste aparelho.</Copy>
          <View>
            {history.map((item) => {
              const topic = getTopic(item.topicId)!;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Continuar ${topic.name}`}
                  key={item.topicId}
                  onPress={() =>
                    router.push({ pathname: '/episode/[id]', params: { id: item.topicId } })
                  }
                  style={({ pressed }) => ({
                    paddingVertical: spacing.lg,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Icon name={topic.icon} symbol={topic.symbol} color={topicColors[topic.id]} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Copy variant="headline">{topic.name}</Copy>
                    <Copy variant="caption" tone="muted">
                      Demonstração · {new Date(item.playedAt).toLocaleDateString('pt-BR')} · 12
                      segundos
                    </Copy>
                    <Copy variant="caption" tone="muted">
                      {item.position >= DEMO_DURATION - 0.25
                        ? 'Ouvir novamente'
                        : `Continuar em ${Math.floor(resumePosition(item.position, DEMO_DURATION))}s`}
                    </Copy>
                  </View>
                  <Icon name="play-circle-outline" symbol="play.circle" color={colors.accent} />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : !podcast.history.length ? (
        <View style={{ paddingVertical: spacing.xl, gap: spacing.lg }}>
          <Icon name="headphones" symbol="headphones" size={48} color={colors.muted} />
          <Copy variant="headline">Seu histórico começa com um play.</Copy>
          <Copy tone="secondary">
            Explore os temas e teste o player. Depois, você poderá continuar de onde parou.
          </Copy>
          <Button title="Explorar temas" onPress={() => router.replace('/')} />
        </View>
      ) : null}
      {podcast.storageError ? <Copy tone="notice">{podcast.storageError}</Copy> : null}
    </Screen>
  );
}
