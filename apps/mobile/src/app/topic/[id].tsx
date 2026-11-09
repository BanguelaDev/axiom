import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getTopic } from '@axiom/core/topics';
import { Screen, Copy, Icon, Button, Notice } from '@/components/ui';
import { useApp } from '@/state/app-state';
import { spacing, sizes, radius } from '@/theme';
import { usePodcast } from '@/state/podcast-state';

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = getTopic(id || '');
  const { colors, topicColors, prepareDemo } = useApp();
  const { begin, preparation } = usePodcast();
  const pending = preparation.status === 'loading' || preparation.status === 'waiting';
  if (!topic)
    return (
      <Screen>
        <Copy variant="title">Tema não encontrado</Copy>
        <Button title="Voltar aos temas" onPress={() => router.replace('/')} />
      </Screen>
    );
  return (
    <Screen>
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <View
          style={{
            width: sizes.heroIcon,
            height: sizes.heroIcon,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon
            name={topic.icon}
            symbol={topic.symbol}
            color={topicColors[topic.id]}
            size={sizes.largeIcon}
          />
        </View>
        <Copy variant="eyebrow" tone="accent">
          UM ASSUNTO. UM NOVO OLHAR.
        </Copy>
        <Copy variant="title">{topic.name}</Copy>
        <Copy tone="secondary">{topic.description}</Copy>
      </View>
      <View
        style={{
          gap: spacing.md,
          paddingVertical: spacing.md,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.line,
        }}
      >
        <Copy variant="headline">O que você vai encontrar</Copy>
        <Copy tone="secondary">
          Um resumo de dois minutos com os acontecimentos das últimas 72 horas, narrado em português
          e acompanhado das fontes.
        </Copy>
      </View>
      <Notice>
        O podcast usa notícias e narração por IA quando o servidor está configurado. Você também
        pode conhecer o player com uma amostra identificada como demonstração.
      </Notice>
      <Button
        title={pending ? 'Acompanhar preparação atual' : 'Gerar podcast de dois minutos'}
        onPress={() => {
          if (!pending) void begin(topic.id);
          router.push({
            pathname: '/generate/[id]',
            params: { id: pending ? preparation.topicId : topic.id },
          });
        }}
      />
      <Button
        title="Preparar demonstração"
        secondary
        onPress={() => {
          prepareDemo(topic.id);
          router.push({ pathname: '/prepare/[id]', params: { id: topic.id } });
        }}
      />
      <Button title="Escolher outro tema" secondary onPress={() => router.replace('/')} />
    </Screen>
  );
}
