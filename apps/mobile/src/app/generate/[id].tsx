import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getTopic } from '@axiom/core/topics';
import { usePodcast } from '@/state/podcast-state';
import { useApp } from '@/state/app-state';
import { Button, Copy, Notice, Screen } from '@/components/ui';
import { spacing } from '@/theme';
export default function GenerateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = getTopic(id || '');
  const { preparation, begin } = usePodcast();
  const { colors } = useApp();
  if (!topic)
    return (
      <Screen>
        <Copy variant="title">Tema não encontrado</Copy>
        <Button title="Voltar aos temas" onPress={() => router.replace('/')} />
      </Screen>
    );
  const state =
    preparation.status !== 'idle' && preparation.topicId === topic.id
      ? preparation
      : { status: 'idle' as const };
  const waiting = state.status === 'loading' || state.status === 'waiting';
  if (
    (preparation.status === 'loading' || preparation.status === 'waiting') &&
    preparation.topicId !== topic.id
  )
    return (
      <Screen>
        <Copy variant="title">Um podcast já está em preparação.</Copy>
        <Copy tone="secondary">Acompanhe a edição atual antes de iniciar outra.</Copy>
        <Button
          title="Ver preparação atual"
          onPress={() =>
            router.replace({ pathname: '/generate/[id]', params: { id: preparation.topicId } })
          }
        />
        <Button title="Explorar temas" secondary onPress={() => router.replace('/')} />
      </Screen>
    );
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        SEU RESUMO DO AGORA
      </Copy>
      <Copy variant="title">
        {state.status === 'ready'
          ? 'Pronto para ouvir.'
          : state.status === 'error'
            ? 'Vamos tentar de novo?'
            : waiting
              ? 'Estamos preparando seu podcast.'
              : 'Dois minutos para se atualizar.'}
      </Copy>
      <Copy tone="secondary">{topic.name}</Copy>
      {waiting ? (
        <View accessibilityLiveRegion="polite" style={{ gap: spacing.md }}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Preparando podcast" />
          <Copy variant="headline">
            {state.status === 'waiting' && state.job.stage === 'queued'
              ? 'Seu pedido está na fila.'
              : 'Buscando notícias, revisando o roteiro e preparando a voz.'}
          </Copy>
          <Copy tone="secondary">
            A primeira preparação pode levar alguns minutos. Você pode explorar o app e voltar; o
            trabalho continua no servidor.
          </Copy>
          <Notice>
            O progresso acompanha o estado informado pelo servidor. A reprodução começa somente
            quando você tocar em ouvir.
          </Notice>
        </View>
      ) : null}
      {state.status === 'ready' ? (
        <>
          <Copy tone="secondary">{state.episode.title}</Copy>
          <Button
            title="Abrir podcast"
            onPress={() =>
              router.replace({ pathname: '/podcast/[id]', params: { id: state.episode.id } })
            }
          />
        </>
      ) : null}
      {state.status === 'error' ? (
        <>
          <Copy tone="notice" accessibilityRole="alert">
            {state.message}
          </Copy>
          <Button
            title={state.jobId ? 'Consultar preparação novamente' : 'Tentar novamente'}
            onPress={() => void begin(topic.id, state.jobId)}
          />
          <Notice>
            Se a conexão caiu durante um pedido, a nova consulta reutiliza o trabalho disponível.
            Conteúdo insuficiente não é completado com notícias inventadas.
          </Notice>
        </>
      ) : null}
      {state.status === 'idle' ? (
        <>
          <Copy tone="secondary">
            Notícias publicadas nas últimas 72 horas, narração por IA e referências para consultar
            depois.
          </Copy>
          <Button title="Gerar podcast de dois minutos" onPress={() => void begin(topic.id)} />
        </>
      ) : null}
      <Button title="Explorar outros temas" secondary onPress={() => router.replace('/')} />
    </Screen>
  );
}
