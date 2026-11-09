import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { requestApi } from '@axiom/core/api-client';
import { ApiFault } from '@axiom/core/api';
import { audioFailures, type AudioDemoReport } from '@axiom/core/audio-report';
import { Screen, Copy, Button, Notice } from '@/components/ui';
import { backendConnection, backendMode, forgetLocalSession } from '@/services/backend';
import { useApp } from '@/state/app-state';
import { radius, spacing } from '@/theme';
import { claimPlayback, registerPlayback } from '@/services/playback';

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; report: AudioDemoReport };
export default function AudioLabScreen() {
  const { colors, pause } = useApp();
  const player = useAudioPlayer(null, { updateInterval: 250 });
  useEffect(() => registerPlayback('audio-lab', () => player.pause()), [player]);
  const status = useAudioPlayerStatus(player);
  const [state, setState] = useState<State>({ status: 'idle' });
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const current = useRef<AbortController | null>(null);
  useEffect(() => {
    // O player nativo expõe volume como propriedade mutável, conforme a API do expo-audio.
    // eslint-disable-next-line react-hooks/immutability
    player.volume = 0.2;
  }, [player]);
  useEffect(() => () => current.current?.abort(), []);
  useEffect(() => {
    if (state.status !== 'ready' || !state.report.mediaPath || status.isLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [state, status.isLoaded]);
  async function inspect(scenario: 'ready' | 'silence' | 'long') {
    if (!backendConnection || backendMode !== 'local') return;
    current.current?.abort();
    player.pause();
    player.replace(null);
    setPlaybackError(null);
    setTimedOut(false);
    const controller = new AbortController();
    current.current = controller;
    setState({ status: 'loading' });
    try {
      const report = (await requestApi(
        backendConnection,
        `/dev/audio?scenario=${scenario}`,
        controller.signal,
      )) as AudioDemoReport;
      if (report?.synthetic !== true || !['ready', 'blocked'].includes(report.status))
        throw new Error('Resposta incompatível.');
      if (controller.signal.aborted) return;
      if (report.status === 'ready') {
        if (!report.mediaPath || !/^\/dev\/media\/[a-f0-9]{48}$/.test(report.mediaPath))
          throw new Error('Endereço de áudio incompatível.');
        player.replace({ uri: `${backendConnection.url.replace(/\/$/, '')}${report.mediaPath}` });
      }
      setState({ status: 'ready', report });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiFault && error.code === 'unauthorized') forgetLocalSession();
      setState({
        status: 'error',
        message:
          error instanceof ApiFault
            ? error.message
            : 'Não conseguimos verificar o áudio. Confira a API local e tente novamente.',
      });
    }
  }
  async function togglePlayback() {
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      pause();
      claimPlayback('audio-lab');
      if (status.currentTime >= status.duration - 0.1) await player.seekTo(0);
      player.play();
    } catch {
      setPlaybackError('Não foi possível reproduzir. Carregue a amostra novamente.');
    }
  }
  const report = state.status === 'ready' ? state.report : null;
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        ETAPA 6 · ÁUDIO
      </Copy>
      <Copy variant="title">Dois minutos, medidos de verdade.</Copy>
      <Notice>
        Esta amostra é um sinal sonoro técnico, sem voz ou notícias. O arquivo é processado com
        FFmpeg e pode ser ouvido após tocar em reproduzir. A voz final ainda precisa de validação.
      </Notice>
      <Button
        title={
          state.status === 'error'
            ? 'Tentar verificação novamente'
            : 'Preparar amostra de dois minutos'
        }
        loading={state.status === 'loading'}
        disabled={backendMode !== 'local'}
        onPress={() => void inspect('ready')}
      />
      <Button
        title="Testar silêncio excessivo"
        secondary
        disabled={backendMode !== 'local' || state.status === 'loading'}
        onPress={() => void inspect('silence')}
      />
      <Button
        title="Testar duração fora da margem"
        secondary
        disabled={backendMode !== 'local' || state.status === 'loading'}
        onPress={() => void inspect('long')}
      />
      {backendMode !== 'local' ? (
        <Copy tone="notice">Esta apresentação requer a API local de desenvolvimento.</Copy>
      ) : null}
      {state.status === 'loading' ? (
        <Copy tone="secondary" accessibilityLiveRegion="polite">
          Medindo o arquivo e conferindo volume e pausas…
        </Copy>
      ) : null}
      {state.status === 'error' ? (
        <Copy accessibilityRole="alert" tone="notice">
          {state.message}
        </Copy>
      ) : null}
      {report ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
          }}
        >
          <Copy variant="headline">
            {report.status === 'ready' ? 'Amostra técnica aprovada' : 'Arquivo bloqueado'}
          </Copy>
          {report.reason ? <Copy tone="notice">{audioFailures[report.reason]}</Copy> : null}
          {report.metrics ? (
            <>
              <Copy>Duração medida: {report.metrics.duration.toFixed(2)} segundos</Copy>
              <Copy variant="caption" tone="secondary">
                {report.metrics.codec.toUpperCase()} ·{' '}
                {report.metrics.sampleRate.toLocaleString('pt-BR')} Hz ·{' '}
                {(report.metrics.bytes / 1024 / 1024).toFixed(2)} MB
              </Copy>
              <Copy variant="caption" tone="secondary">
                Volume:{' '}
                {report.metrics.integratedLufs === null
                  ? 'sem sinal mensurável'
                  : `${report.metrics.integratedLufs.toFixed(1)} LUFS`}{' '}
                · Maior pausa: {report.metrics.longestSilence.toFixed(1)} s
              </Copy>
            </>
          ) : null}
          {report.status === 'ready' ? (
            <>
              <Copy variant="caption" tone="muted">
                {Math.floor(status.currentTime)} de{' '}
                {Math.round(status.duration || report.metrics?.duration || 120)} segundos · Sinal
                sem narração
              </Copy>
              <Button
                title={status.playing ? 'Pausar amostra técnica' : 'Reproduzir amostra técnica'}
                disabled={!status.isLoaded || timedOut || !!status.error}
                onPress={() => void togglePlayback()}
              />
              {!status.isLoaded && !timedOut ? (
                <Copy variant="caption" tone="muted">
                  Carregando o arquivo para reprodução…
                </Copy>
              ) : null}
              {timedOut || status.error || playbackError ? (
                <>
                  <Copy tone="notice">
                    {playbackError || 'O arquivo não carregou. Tente novamente.'}
                  </Copy>
                  <Button
                    title="Carregar amostra novamente"
                    secondary
                    onPress={() => void inspect('ready')}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
      <Button
        title="Voltar à apresentação"
        secondary
        onPress={() => router.replace('/prototype')}
      />
    </Screen>
  );
}
