import { View, Pressable } from 'react-native';
import { router, Redirect } from 'expo-router';
import { topics } from '@axiom/core/topics';
import { Copy, Icon, Screen, Notice, Button } from '@/components/ui';
import { usePodcast } from '@/state/podcast-state';
import { useApp } from '@/state/app-state';
import { spacing, radius, sizes } from '@/theme';
import { backendConnection, localServerEnabled } from '@/services/backend';
export default function HomeScreen() {
  const { colors, topicColors } = useApp();
  const { preparation } = usePodcast();
  if (localServerEnabled && !backendConnection) return <Redirect href="/connection" />;
  return (
    <Screen>
      <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
        <Copy variant="eyebrow" tone="accent">
          MENOS TEMPO. MAIS CONTEXTO.
        </Copy>
        <Copy variant="hero">O mundo, em{'\n'}dois minutos.</Copy>
        <Copy tone="secondary">
          Escolha um assunto. A gente transforma as notícias recentes em algo que você pode ouvir.
        </Copy>
        <Notice>
          Resumos e voz gerados por IA, com referências para consultar. A geração depende do
          servidor configurado. As amostras de apresentação são identificadas separadamente.
        </Notice>
      </View>
      {preparation.status !== 'idle' ? (
        <Button
          title={
            preparation.status === 'ready' ? 'Seu podcast está pronto' : 'Acompanhar sua preparação'
          }
          secondary
          onPress={() =>
            router.push({ pathname: '/generate/[id]', params: { id: preparation.topicId } })
          }
        />
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.wide,
          paddingVertical: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="headphones" symbol="headphones" color={colors.accent} size={18} />
          <Copy variant="caption" tone="secondary">
            Podcasts de 2 minutos
          </Copy>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="clock-outline" symbol="clock" color={colors.accent} size={18} />
          <Copy variant="caption" tone="secondary">
            Últimas 72 horas
          </Copy>
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Copy variant="headline">O que você quer entender?</Copy>
        <Copy variant="caption" tone="muted">
          Seis temas, diferentes perspectivas.
        </Copy>
      </View>
      <View>
        {topics.map((topic, index) => (
          <Pressable
            key={topic.id}
            accessibilityRole="button"
            accessibilityLabel={`Explorar ${topic.name}`}
            onPress={() => router.push({ pathname: '/topic/[id]', params: { id: topic.id } })}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.wide,
              borderBottomWidth: index < topics.length - 1 ? 1 : 0,
              borderBottomColor: colors.line,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <View
              style={{
                width: sizes.touch,
                height: sizes.touch,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={topic.icon} symbol={topic.symbol} color={topicColors[topic.id]} />
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Copy variant="headline">{topic.name}</Copy>
              <Copy variant="caption" tone="secondary">
                {topic.description}
              </Copy>
            </View>
            <Icon name="chevron-right" symbol="chevron.right" color={colors.muted} size={18} />
          </Pressable>
        ))}
      </View>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingTop: spacing.md,
          gap: spacing.xs,
        }}
      >
        <Copy variant="eyebrow" tone="muted">
          PROJETO ACADÊMICO · AEMS
        </Copy>
        <Copy variant="caption" tone="muted">
          Notícias recentes, referências para consultar e narração por inteligência artificial. Um
          projeto para ouvir e aprender.
        </Copy>
      </View>
    </Screen>
  );
}
