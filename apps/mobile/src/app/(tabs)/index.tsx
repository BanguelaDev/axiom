import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { topics } from '@axiom/core/topics';
import { Copy, Icon, Screen, Notice } from '@/components/ui';
import { useApp } from '@/state/app-state';
import { spacing, radius, sizes } from '@/theme';
export default function HomeScreen() {
  const { colors, topicColors } = useApp();
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
          Você está explorando o protótipo. O player usa uma amostra de 12 segundos; as notícias e a
          voz final ainda estão em validação.
        </Notice>
      </View>
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
          PRIMEIRA VERSÃO · DEMONSTRAÇÃO
        </Copy>
        <Copy variant="caption" tone="muted">
          Explore as telas e o player. A geração de notícias e a voz final aguardam a configuração
          dos serviços.
        </Copy>
      </View>
    </Screen>
  );
}
