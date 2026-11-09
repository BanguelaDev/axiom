import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Picker } from '@expo/ui';
import { router } from 'expo-router';
import { topics, type TopicId } from '@axiom/core/topics';
import { requestApi } from '@axiom/core/api-client';
import { ApiFault } from '@axiom/core/api';
import {
  editorialChecks,
  editorialFailures,
  type EditorialDemoReport,
  type EditorialScenario,
} from '@axiom/core/editorial-report';
import { ControlsHost } from '@/components/controls-host';
import { Screen, Copy, Button, Notice } from '@/components/ui';
import { backendConnection, backendMode, forgetLocalSession } from '@/services/backend';
import { useApp } from '@/state/app-state';
import { radius, spacing } from '@/theme';

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; report: EditorialDemoReport };
export default function EditorialScreen() {
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
  async function inspect(scenario: EditorialScenario) {
    if (!backendConnection || backendMode !== 'local') return;
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setState({ status: 'loading' });
    try {
      const report = (await requestApi(
        backendConnection,
        `/dev/editorial/${topicId}?scenario=${scenario}`,
        controller.signal,
      )) as EditorialDemoReport;
      if (
        report?.simulated !== true ||
        report.topicId !== topicId ||
        !['approved', 'blocked'].includes(report.status) ||
        !Array.isArray(report.checks)
      )
        throw new Error('Relatório incompatível.');
      if (!controller.signal.aborted) setState({ status: 'ready', report });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiFault && error.code === 'unauthorized') forgetLocalSession();
      setState({
        status: 'error',
        message:
          error instanceof ApiFault
            ? error.message
            : 'Não conseguimos consultar a revisão. Confira a API local e tente novamente.',
      });
    }
  }
  const report = state.status === 'ready' ? state.report : null;
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        ETAPA 5 · ROTEIRO E REVISÃO
      </Copy>
      <Copy variant="title">Cada afirmação precisa de fonte.</Copy>
      <Copy tone="secondary">
        Acompanhe os controles aplicados antes de transformar um resumo em voz. O roteiro fica
        somente no servidor.
      </Copy>
      <Notice>
        Cenários fictícios calculados no servidor local. A IA e a avaliação editorial estão
        simuladas; não há notícias reais, geração de áudio ou exibição do roteiro.
      </Notice>
      <ControlsHost>
        <Picker<TopicId>
          selectedValue={topicId}
          onValueChange={changeTopic}
          testID="editorial-topic"
        >
          {topics.map((topic) => (
            <Picker.Item key={topic.id} label={topic.name} value={topic.id} />
          ))}
        </Picker>
      </ControlsHost>
      <Button
        title={state.status === 'error' ? 'Tentar revisão novamente' : 'Testar revisão completa'}
        loading={state.status === 'loading'}
        disabled={backendMode !== 'local'}
        onPress={() => void inspect('approved')}
      />
      <Button
        title="Testar evidência ausente"
        secondary
        disabled={backendMode !== 'local' || state.status === 'loading'}
        onPress={() => void inspect('missing_evidence')}
      />
      <Button
        title="Testar contradição na revisão"
        secondary
        disabled={backendMode !== 'local' || state.status === 'loading'}
        onPress={() => void inspect('contradiction')}
      />
      {backendMode !== 'local' ? (
        <Copy tone="notice">Esta apresentação requer a API local de desenvolvimento.</Copy>
      ) : null}
      {state.status === 'loading' ? (
        <Copy tone="secondary" accessibilityLiveRegion="polite">
          Conferindo os controles da demonstração…
        </Copy>
      ) : null}
      {state.status === 'error' ? (
        <View accessibilityRole="alert" style={{ gap: spacing.sm }}>
          <Copy variant="headline">Revisão não concluída</Copy>
          <Copy tone="notice">{state.message}</Copy>
        </View>
      ) : null}
      {report ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            gap: spacing.md,
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
          }}
        >
          <Copy variant="headline">
            {report.status === 'approved'
              ? 'Demonstração aprovada'
              : 'Conteúdo bloqueado antes da voz'}
          </Copy>
          <Copy tone="secondary">
            {report.sourceCount} fontes · {report.factCount} fatos conferidos · {report.claimCount}{' '}
            afirmações vinculadas
          </Copy>
          {report.reason ? (
            <Copy tone="notice">{editorialFailures[report.reason]}</Copy>
          ) : (
            <Copy tone="secondary">
              Os controles passaram neste exemplo. Isso não aprova notícias reais nem habilita a
              geração de podcasts.
            </Copy>
          )}
          {report.checks.map((check) => (
            <View key={check.key} style={{ gap: spacing.sm }}>
              <Copy variant="caption">{editorialChecks[check.key]}</Copy>
              <Copy
                variant="caption"
                tone={
                  check.status === 'passed'
                    ? 'accent'
                    : check.status === 'blocked'
                      ? 'notice'
                      : 'muted'
                }
              >
                {check.status === 'passed'
                  ? 'Conferido'
                  : check.status === 'blocked'
                    ? 'Bloqueado'
                    : 'Não executado'}
              </Copy>
            </View>
          ))}
        </View>
      ) : state.status === 'idle' ? (
        <Copy tone="secondary">
          Escolha um tema e teste um cenário. Somente o resultado dos controles chega ao aplicativo.
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
