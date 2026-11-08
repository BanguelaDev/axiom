import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { getTopic } from '@axiom/core/topics';
import { Copy, Icon } from '@/components/ui';
import { useApp } from '@/state/app-state';
import { spacing, sizes } from '@/theme';

export function MiniPlayer() {
  const { activeTopic, colors, topicColors, status, play, pause, startingPlayback } = useApp();
  const topic = activeTopic ? getTopic(activeTopic) : null;
  if (!topic) return null;
  return (
    <View
      style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.compact,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          width: '100%',
          maxWidth: sizes.content,
          alignSelf: 'center',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir player de ${topic.name}`}
          onPress={() => router.push({ pathname: '/episode/[id]', params: { id: topic.id } })}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.compact,
            minHeight: sizes.touch,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name={topic.icon} symbol={topic.symbol} color={topicColors[topic.id]} />
          <View style={{ flex: 1 }}>
            <Copy variant="caption" tone="muted">
              AMOSTRA · 12 SEGUNDOS
            </Copy>
            <Copy variant="headline" numberOfLines={1}>
              {topic.name}
            </Copy>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Pausar amostra' : 'Continuar amostra'}
          accessibilityState={{
            disabled: !status.isLoaded || startingPlayback,
            busy: startingPlayback,
          }}
          disabled={!status.isLoaded || startingPlayback}
          onPress={() => (status.playing ? pause() : void play(topic.id))}
          style={({ pressed }) => ({
            minWidth: sizes.touch,
            minHeight: sizes.touch,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon
            name={status.playing ? 'pause' : 'play'}
            symbol={status.playing ? 'pause.fill' : 'play.fill'}
            color={colors.accent}
          />
        </Pressable>
      </View>
    </View>
  );
}
