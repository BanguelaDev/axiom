import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ApiFault } from '@axiom/core/api';
import { inspectApi, type ApiInspection } from '@axiom/core/api-client';
import { Screen, Copy, Button, Notice } from '@/components/ui';
import { backendConnection, backendMode, forgetLocalSession } from '@/services/backend';
import { useApp } from '@/state/app-state';
import { spacing, radius } from '@/theme';

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; result: ApiInspection };
export default function IntegrationScreen() {
  const { colors } = useApp();
  const [state, setState] = useState<State>({ status: 'idle' });
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);
  async function check() {
    if (!backendConnection) return;
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setState({ status: 'loading' });
    try {
      const result = await inspectApi(backendConnection, controller.signal);
      if (!controller.signal.aborted) setState({ status: 'ready', result });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiFault && error.code === 'unauthorized') forgetLocalSession();
      setState({
        status: 'error',
        message:
          error instanceof ApiFault
            ? error.message
            : 'Não conseguimos conectar ao servidor. Confira a conexão e tente novamente.',
      });
    }
  }
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        CONEXÃO DO APLICATIVO
      </Copy>
      <Copy variant="title">Uma conexão de cada vez.</Copy>
      <Copy tone="secondary">
        Este espaço de apresentação verifica se o aplicativo consegue iniciar uma sessão e consultar
        os seis temas no servidor.
      </Copy>
      <Notice>
        {backendMode === 'local'
          ? 'O servidor funciona no computador e preserva os pedidos no banco local. Esta verificação consulta a conexão e o catálogo; não prepara um podcast.'
          : backendMode === 'supabase'
            ? 'Conexão configurada com Supabase. O teste inicia uma sessão anônima e consulta o catálogo; não solicita um podcast.'
            : 'A integração ainda precisa ser configurada. A demonstração das telas continua disponível.'}
      </Notice>
      {state.status === 'ready' ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            gap: spacing.md,
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
          }}
        >
          <Copy variant="headline">Conexão verificada</Copy>
          <Copy tone="secondary">
            Sessão aceita pelo servidor. Os seis temas estão disponíveis.
          </Copy>
          <Copy variant="caption" tone="muted">
            {state.result.health.environment === 'development'
              ? 'Desenvolvimento local'
              : state.result.health.environment === 'staging'
                ? 'Ambiente de testes'
                : 'Produção'}{' '}
            · API v{state.result.health.version}
          </Copy>
          {state.result.topics.map((topic) => (
            <Copy key={topic.id} variant="caption">
              {topic.name}
            </Copy>
          ))}
          <Copy tone="notice">
            {state.result.health.generationAvailable
              ? 'Geração habilitada no servidor. Este teste não solicita áudio.'
              : 'A geração real permanece desativada até a validação das integrações.'}
          </Copy>
        </View>
      ) : state.status === 'error' ? (
        <View accessibilityRole="alert" style={{ gap: spacing.sm }}>
          <Copy variant="headline">Conexão não concluída</Copy>
          <Copy tone="notice">{state.message}</Copy>
        </View>
      ) : (
        <Copy tone="secondary" accessibilityLiveRegion="polite">
          {state.status === 'loading'
            ? 'Iniciando sessão e consultando o servidor…'
            : 'Toque abaixo para verificar a integração.'}
        </Copy>
      )}
      <Button
        title={
          state.status === 'error'
            ? 'Tentar conexão novamente'
            : state.status === 'ready'
              ? 'Verificar novamente'
              : 'Verificar conexão'
        }
        disabled={!backendConnection}
        loading={state.status === 'loading'}
        onPress={() => void check()}
      />
      <Button
        title="Voltar à apresentação"
        secondary
        onPress={() => router.replace('/prototype')}
      />
    </Screen>
  );
}
