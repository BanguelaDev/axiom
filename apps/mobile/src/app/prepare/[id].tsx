import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getTopic } from '@axiom/core/topics';
import { demoStages } from '@axiom/core/demo-generation';
import { Copy, Screen, Button, Notice, Icon } from '@/components/ui';
import { useApp } from '@/state/app-state';
import { spacing, sizes } from '@/theme';

export default function PrepareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = getTopic(id || '');
  const { generation, prepareDemo, cancelDemo, colors } = useApp();
  if (!topic)
    return (
      <Screen>
        <Copy variant="title">Tema não encontrado</Copy>
        <Button title="Voltar aos temas" onPress={() => router.replace('/')} />
      </Screen>
    );
  const state = generation.topicId === topic.id ? generation.status : 'idle';
  const description =
    state === 'empty'
      ? 'Neste cenário simulado, não há notícias recentes suficientes para montar o episódio. A janela de 72 horas é mantida.'
      : state === 'error'
        ? 'Neste cenário simulado, a preparação foi interrompida. Você pode tentar novamente ou escolher outro tema.'
        : 'A amostra já está pronta para você explorar os controles de reprodução.';
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        DEMONSTRAÇÃO LOCAL
      </Copy>
      <Copy variant="title">
        {state === 'preparing'
          ? 'Um instante para começar.'
          : state === 'empty'
            ? 'Sem notícias suficientes.'
            : state === 'error'
              ? 'Não foi possível preparar.'
              : state === 'ready'
                ? 'Tudo pronto para o play.'
                : 'Vamos conhecer o AXIOM?'}
      </Copy>
      <Copy tone="secondary">{topic.name}</Copy>
      <Notice>
        Os passos desta apresentação são simulados. Nenhuma busca de notícias ou geração de voz está
        acontecendo.
      </Notice>
      {state === 'preparing' ? (
        <>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Preparação da demonstração"
            accessibilityValue={{ min: 0, max: demoStages.length, now: generation.step + 1 }}
            style={{ gap: spacing.lg }}
          >
            {demoStages.map((stage, index) => (
              <View
                key={stage.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.sm,
                  opacity: index > generation.step ? 0.5 : 1,
                }}
              >
                {index === generation.step ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Icon
                    name={index < generation.step ? 'check-circle-outline' : 'circle-outline'}
                    symbol={index < generation.step ? 'checkmark.circle' : 'circle'}
                    color={index < generation.step ? colors.accent : colors.muted}
                  />
                )}
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Copy variant="headline">{stage.title}</Copy>
                  <Copy variant="caption" tone="secondary">
                    {stage.description}
                  </Copy>
                </View>
              </View>
            ))}
          </View>
          <View accessibilityLiveRegion="polite">
            <Copy variant="caption" tone="muted">
              Passo {generation.step + 1} de {demoStages.length}
            </Copy>
          </View>
          <Button
            title="Cancelar preparação"
            secondary
            onPress={() => {
              cancelDemo();
              router.replace({ pathname: '/topic/[id]', params: { id: topic.id } });
            }}
          />
        </>
      ) : state === 'ready' ? (
        <>
          <Icon
            name="check-circle-outline"
            symbol="checkmark.circle"
            size={sizes.largeIcon}
            color={colors.accent}
          />
          <Copy tone="secondary">{description}</Copy>
          <Copy variant="caption" tone="muted">
            Amostra sonora · 12 segundos · Sem narração
          </Copy>
          <Button
            title="Abrir player"
            onPress={() => router.replace({ pathname: '/episode/[id]', params: { id: topic.id } })}
          />
        </>
      ) : state === 'empty' || state === 'error' ? (
        <>
          <Icon
            name={state === 'empty' ? 'text-box-search-outline' : 'cloud-alert-outline'}
            symbol={state === 'empty' ? 'doc.text.magnifyingglass' : 'exclamationmark.icloud'}
            size={sizes.largeIcon}
            color={colors.notice}
          />
          <Copy accessibilityLiveRegion="polite" tone="secondary">
            {description}
          </Copy>
          <Button
            title={state === 'error' ? 'Tentar novamente' : 'Conhecer a amostra'}
            onPress={() => prepareDemo(topic.id, 'ready')}
          />
        </>
      ) : (
        <Button title="Iniciar demonstração" onPress={() => prepareDemo(topic.id)} />
      )}
      {state !== 'preparing' ? (
        <Button title="Escolher outro tema" secondary onPress={() => router.replace('/')} />
      ) : null}
    </Screen>
  );
}
