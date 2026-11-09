import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Picker } from '@expo/ui';
import { router } from 'expo-router';
import { topics, type TopicId } from '@axiom/core/topics';
import { requestApi } from '@axiom/core/api-client';
import { ApiFault } from '@axiom/core/api';
import { selectionReasons, type DemoSelection } from '@axiom/core/selection-report';
import { ControlsHost } from '@/components/controls-host';
import { Screen, Copy, Button, Notice } from '@/components/ui';
import { backendConnection, backendMode, forgetLocalSession } from '@/services/backend';
import { useApp } from '@/state/app-state';
import { radius, spacing } from '@/theme';

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; result: DemoSelection };
export default function SelectionScreen() {
  const { colors } = useApp();
  const [topicId, setTopic] = useState<TopicId>('ai');
  const [state, setState] = useState<State>({ status: 'idle' });
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);
  function changeTopic(topic: TopicId) {
    current.current?.abort();
    setTopic(topic);
    setState({ status: 'idle' });
  }
  async function inspect(insufficient = false) {
    if (!backendConnection || backendMode !== 'local') return;
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setState({ status: 'loading' });
    try {
      const result = (await requestApi(
        backendConnection,
        `/dev/selection/${topicId}?scenario=${insufficient ? 'insufficient' : 'ready'}`,
        controller.signal,
      )) as DemoSelection;
      if (
        result?.simulated !== true ||
        result.report?.version !== 1 ||
        result.report.topicId !== topicId ||
        !Array.isArray(result.report.decisions)
      )
        throw new Error('Relatório incompatível.');
      if (!controller.signal.aborted) setState({ status: 'ready', result });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiFault && error.code === 'unauthorized') forgetLocalSession();
      setState({
        status: 'error',
        message:
          error instanceof ApiFault
            ? error.message
            : 'Não conseguimos consultar a seleção. Confira se a API local está disponível e tente novamente.',
      });
    }
  }
  const report = state.status === 'ready' ? state.result.report : null;
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        ETAPA 4 · COLETA E SELEÇÃO
      </Copy>
      <Copy variant="title">Antes da voz, as fontes.</Copy>
      <Copy tone="secondary">
        Veja como o AXIOM seleciona matérias recentes e registra o motivo de cada descarte.
      </Copy>
      <Notice>
        Exemplos fictícios para apresentar os critérios do projeto. A seleção é calculada no
        servidor local, sem consultar notícias reais nem gerar áudio.
      </Notice>
      <ControlsHost>
        <Picker<TopicId>
          selectedValue={topicId}
          onValueChange={changeTopic}
          testID="selection-topic"
        >
          {topics.map((topic) => (
            <Picker.Item key={topic.id} label={topic.name} value={topic.id} />
          ))}
        </Picker>
      </ControlsHost>
      <Button
        title={state.status === 'error' ? 'Tentar seleção novamente' : 'Ver exemplo de seleção'}
        loading={state.status === 'loading'}
        disabled={backendMode !== 'local'}
        onPress={() => void inspect()}
      />
      <Button
        title="Testar fontes insuficientes"
        secondary
        disabled={backendMode !== 'local' || state.status === 'loading'}
        onPress={() => void inspect(true)}
      />
      {backendMode !== 'local' ? (
        <Copy tone="notice">Esta apresentação requer a API local de desenvolvimento.</Copy>
      ) : null}
      {state.status === 'loading' ? (
        <Copy accessibilityLiveRegion="polite" tone="secondary">
          Conferindo datas, tema e fontes…
        </Copy>
      ) : null}
      {state.status === 'error' ? (
        <View accessibilityRole="alert" style={{ gap: spacing.sm }}>
          <Copy variant="headline">Seleção não concluída</Copy>
          <Copy tone="notice">{state.message}</Copy>
        </View>
      ) : null}
      {report ? (
        <>
          <View
            accessibilityLiveRegion="polite"
            style={{
              gap: spacing.sm,
              padding: spacing.lg,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
            }}
          >
            <Copy variant="headline">
              {report.status === 'ready'
                ? 'Amostra com fontes suficientes'
                : 'Fontes independentes insuficientes'}
            </Copy>
            <Copy tone="secondary">
              {report.received} recebidas · {report.selected} selecionadas ·{' '}
              {report.independentSources}{' '}
              {report.independentSources === 1 ? 'grupo de origem' : 'grupos de origem'}
            </Copy>
            <Copy variant="caption" tone="muted">
              {report.events.length} acontecimentos agrupados. Janela de 72 horas.
            </Copy>
            {report.status === 'insufficient' ? (
              <Copy tone="notice">
                A pauta fica bloqueada. Não ampliamos a janela nem inventamos conteúdo para
                completá-la.
              </Copy>
            ) : null}
          </View>
          <Copy variant="headline">Por que cada matéria entrou ou saiu</Copy>
          {report.decisions.map((decision, index) => (
            <View
              key={`${decision.id}:${index}`}
              style={{
                gap: spacing.sm,
                paddingBottom: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
              }}
            >
              <Copy variant="caption" tone={decision.reason === 'selected' ? 'accent' : 'muted'}>
                {selectionReasons[decision.reason]}
              </Copy>
              <Copy>{decision.title}</Copy>
              <Copy variant="caption" tone="secondary">
                {decision.publisher}
              </Copy>
              {decision.publishedAt ? (
                <Copy variant="caption" tone="muted">
                  {new Date(decision.publishedAt).toLocaleString('pt-BR')}
                </Copy>
              ) : null}
            </View>
          ))}
        </>
      ) : state.status === 'idle' ? (
        <Copy tone="secondary">
          Escolha um tema e consulte a amostra. O resultado não representa cobertura jornalística
          real.
        </Copy>
      ) : null}
      <Button
        title="Voltar à apresentação"
        secondary
        onPress={() => router.replace('/prototype')}
      />
    </Screen>
  );
}
