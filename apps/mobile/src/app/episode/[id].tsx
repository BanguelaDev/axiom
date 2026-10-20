import { View, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Host, Slider } from '@expo/ui';
import { getTopic } from '@axiom/core/topics';
import { Screen, Copy, Icon, Button, Notice } from '@/components/ui';
import { useApp } from '@/state/app-state';
import { spacing, radius, sizes, waveform } from '@/theme';
function time(value: number) {
  const seconds = Math.floor(Math.max(0, value || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export default function EpisodeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = getTopic(id || '');
  const { colors, scheme, player, status, activeTopic, play, seek, audioError } = useApp();
  if (!topic)
    return (
      <Screen>
        <Copy variant="title">Tema não encontrado</Copy>
        <Copy tone="secondary">Escolha um dos seis assuntos disponíveis.</Copy>
        <Button title="Voltar aos temas" onPress={() => router.replace('/')} />
      </Screen>
    );
  const active = activeTopic === topic.id;
  const position = active ? status.currentTime : 0;
  const duration = status.duration || 12;
  const playing = active && status.playing;
  const error = audioError || status.error;
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: spacing.lg, paddingTop: spacing.md }}>
        <Copy variant="eyebrow" style={{ color: topic.color }}>
          DEMONSTRAÇÃO DO PLAYER
        </Copy>
        <View
          style={{
            width: sizes.artwork,
            height: sizes.artwork,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.lg,
          }}
        >
          <Icon name={topic.icon} symbol={topic.symbol} size={56} color={topic.color} />
          <Copy variant="eyebrow" tone="muted">
            AXIOM
          </Copy>
        </View>
        <View style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Copy variant="title" style={{ textAlign: 'center' }}>
            {topic.name}
          </Copy>
          <Copy tone="secondary" style={{ textAlign: 'center' }}>
            Um primeiro contato com o seu próximo podcast.
          </Copy>
        </View>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          height: 100,
          flexDirection: 'row',
          gap: spacing.xs,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {waveform.map((height, index) => (
          <View
            key={index}
            style={{
              height,
              width: sizes.waveWidth,
              borderRadius: radius.full,
              backgroundColor:
                index / waveform.length <= position / duration ? topic.color : colors.line,
            }}
          />
        ))}
      </View>
      <View style={{ gap: spacing.sm }}>
        <Host matchContents colorScheme={scheme} seedColor={colors.accent}>
          <Slider
            value={position}
            min={0}
            max={duration}
            step={0.1}
            onValueChange={(value) => {
              void seek(value);
            }}
            disabled={!active || !status.isLoaded}
            testID="audio-progress"
          />
        </Host>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Copy variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
            {time(position)}
          </Copy>
          <Copy variant="caption" tone="muted">
            {time(duration)}
          </Copy>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.xl,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar 15 segundos"
          disabled={!active || !status.isLoaded}
          onPress={() => {
            void seek(position - 15);
          }}
          style={{ padding: spacing.compact, opacity: active ? 1 : 0.4 }}
        >
          <Icon name="rewind-15" symbol="gobackward.15" size={32} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pausar áudio de teste' : 'Reproduzir áudio de teste'}
          accessibilityState={{ disabled: !status.isLoaded, busy: !status.isLoaded }}
          disabled={!status.isLoaded}
          onPress={() => (playing ? player.pause() : void play(topic.id))}
          style={({ pressed }) => ({
            height: sizes.play,
            width: sizes.play,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {status.isLoaded ? (
            <Icon
              name={playing ? 'pause' : 'play'}
              symbol={playing ? 'pause.fill' : 'play.fill'}
              size={36}
              color={colors.onAccent}
            />
          ) : (
            <ActivityIndicator color={colors.onAccent} />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Avançar 15 segundos"
          disabled={!active || !status.isLoaded}
          onPress={() => {
            void seek(position + 15);
          }}
          style={{ padding: spacing.compact, opacity: active ? 1 : 0.4 }}
        >
          <Icon name="fast-forward-15" symbol="goforward.15" size={32} />
        </Pressable>
      </View>
      {error ? (
        <>
          <Copy tone="notice">{error}</Copy>
          <Button
            title="Tentar carregar novamente"
            onPress={() => player.replace(require('../../../assets/audio/player-test.wav'))}
            secondary
          />
        </>
      ) : null}
      <Notice>
        Esta é uma amostra sonora de 12 segundos, sem notícias e sem narração. Os episódios reais
        terão dois minutos e voz em português, após a validação dos serviços.
      </Notice>
      <Button
        title="Consultar fontes"
        secondary
        onPress={() => router.push({ pathname: '/sources/[id]', params: { id: topic.id } })}
      />
    </Screen>
  );
}
