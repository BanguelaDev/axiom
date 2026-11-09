import { nativeAudioControls } from '@/services/audio-capabilities';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { ApiFault, type PublicEpisode, type PublicJob } from '@axiom/core/api';
import { inspectApi } from '@axiom/core/api-client';
import {
  getAudio,
  getEpisode,
  getJob,
  requestGeneration,
  parsePodcastHistory,
  isId,
  type PodcastHistory,
} from '@axiom/core/podcast';
import { getTopic, type TopicId } from '@axiom/core/topics';
import { backendConnection, forgetLocalSession } from '@/services/backend';
import { registerPlayback, claimPlayback } from '@/services/playback';

type Preparation =
  | { status: 'idle' }
  | { status: 'loading'; topicId: TopicId }
  | { status: 'waiting'; topicId: TopicId; job: PublicJob }
  | { status: 'ready'; topicId: TopicId; episode: PublicEpisode }
  | { status: 'error'; topicId: TopicId; message: string; jobId?: string };
const historyKey = 'axiom:podcast-history:v1',
  pendingKey = 'axiom:pending-generation:v1';
const connectionError =
  'Não conseguimos conectar ao servidor. Confira sua conexão e tente novamente.';
const safeError = (error: unknown) => {
  if (error instanceof ApiFault) {
    if (error.code === 'unauthorized') forgetLocalSession();
    return error.message;
  }
  return connectionError;
};
function usePodcastValue() {
  const [preparation, setPreparation] = useState<Preparation>({ status: 'idle' });
  const [episode, setEpisode] = useState<PublicEpisode | null>(null);
  const [history, setHistory] = useState<PodcastHistory[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [starting, setStarting] = useState(false);
  const [positionReady, setPositionReady] = useState(false);
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const generationRequest = useRef<AbortController | null>(null),
    audioRequest = useRef<AbortController | null>(null);
  const saved = useRef<PodcastHistory[]>([]),
    currentEpisode = useRef<PublicEpisode | null>(null);
  const writes = useRef(Promise.resolve()),
    pendingWrites = useRef(Promise.resolve());
  const playbackRequest = useRef(0),
    busy = useRef(false);
  const canSavePosition = useRef(false);
  useEffect(
    () =>
      registerPlayback('podcast', () => {
        ++playbackRequest.current;
        player.pause();
        setStarting(false);
      }),
    [player],
  );
  useEffect(() => {
    saved.current = history;
  }, [history]);
  useEffect(() => {
    currentEpisode.current = episode;
  }, [episode]);
  function persistPending(value: { id: string; topicId: TopicId } | null) {
    pendingWrites.current = pendingWrites.current
      .then(() =>
        value
          ? AsyncStorage.setItem(
              pendingKey,
              JSON.stringify({ ...value, url: backendConnection?.url, createdAt: Date.now() }),
            )
          : AsyncStorage.removeItem(pendingKey),
      )
      .catch(() => setStorageError('Não foi possível salvar a preparação neste aparelho.'));
  }
  async function watch(job: PublicJob, signal: AbortSignal) {
    if (!backendConnection) throw new Error();
    const deadline = Date.now() + 10 * 60_000;
    while (!signal.aborted) {
      setPreparation({ status: 'waiting', topicId: job.topicId, job });
      if (job.stage === 'failed') {
        persistPending(null);
        setPreparation({
          status: 'error',
          topicId: job.topicId,
          message:
            job.message || 'Não foi possível preparar este episódio. Tente novamente mais tarde.',
        });
        return;
      }
      if (job.stage === 'ready') {
        if (!job.episodeId) throw new Error();
        const ready = await getEpisode(backendConnection, job.episodeId, signal);
        if (ready.topicId !== job.topicId) throw new Error();
        persistPending(null);
        setPreparation({ status: 'ready', topicId: job.topicId, episode: ready });
        return;
      }
      if (Date.now() >= deadline) throw new Error();
      await new Promise<void>((resolve, reject) => {
        const cancel = () => {
          clearTimeout(timer);
          reject(new Error());
        };
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', cancel);
          resolve();
        }, 2000);
        signal.addEventListener('abort', cancel, { once: true });
        if (signal.aborted) cancel();
      });
      job = await getJob(backendConnection, job.id, signal);
    }
  }
  async function begin(topicId: TopicId, resumeId?: string) {
    if (busy.current) return;
    busy.current = true;
    generationRequest.current?.abort();
    const controller = new AbortController();
    generationRequest.current = controller;
    let jobId = resumeId;
    setPreparation({ status: 'loading', topicId });
    try {
      if (!backendConnection) throw new ApiFault('generation_unavailable', 503);
      if (resumeId) {
        const job = await getJob(backendConnection, resumeId, controller.signal);
        if (job.topicId !== topicId) throw new Error();
        await watch(job, controller.signal);
      } else {
        const health = await inspectApi(backendConnection, controller.signal);
        if (!health.health.generationAvailable) throw new ApiFault('generation_unavailable', 503);
        const result = await requestGeneration(backendConnection, topicId, controller.signal);
        if (result.kind === 'episode') {
          if (result.episode.topicId !== topicId) throw new Error();
          persistPending(null);
          setPreparation({ status: 'ready', topicId, episode: result.episode });
        } else {
          if (result.job.topicId !== topicId) throw new Error();
          jobId = result.job.id;
          persistPending({ id: jobId, topicId });
          await watch(result.job, controller.signal);
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof ApiFault && error.code === 'not_found') {
          persistPending(null);
          jobId = undefined;
        }
        setPreparation({ status: 'error', topicId, message: safeError(error), jobId });
      }
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(historyKey)
      .then((raw) => {
        if (alive) setHistory(parsePodcastHistory(raw));
      })
      .catch(() => {
        if (alive) setStorageError('Não foi possível recuperar seu histórico.');
      })
      .finally(() => {
        if (alive) setHydrated(true);
      });
    void AsyncStorage.getItem(pendingKey)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const value = JSON.parse(raw);
          if (
            isId(value.id) &&
            getTopic(value.topicId) &&
            value.url === backendConnection?.url &&
            Number.isFinite(value.createdAt) &&
            Date.now() - value.createdAt < 3_600_000 &&
            Date.now() >= value.createdAt
          )
            void begin(value.topicId, value.id);
        } catch {
          /* Preparação inválida não inicia nenhum pedido. */
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      generationRequest.current?.abort();
      audioRequest.current?.abort();
    };
    // A recuperação ocorre uma vez; mudanças de tela não iniciam trabalhos novos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const value = JSON.stringify(history);
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(historyKey, value))
      .catch(() => setStorageError('Não foi possível salvar seu histórico.'));
  }, [history, hydrated]);
  const savePosition = useCallback(() => {
    const selected = currentEpisode.current;
    if (!selected || !player.isLoaded || !canSavePosition.current) return;
    const position = Math.max(0, Math.min(selected.durationSeconds, player.currentTime));
    setHistory((items) =>
      items.map((item) =>
        item.id === selected.id && Math.abs(item.position - position) > 0.1
          ? { ...item, position }
          : item,
      ),
    );
  }, [player]);
  useEffect(() => {
    const timer = setInterval(savePosition, 2000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') savePosition();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [savePosition]);
  useEffect(() => {
    if (!episode || loading || status.isLoaded || status.error) return;
    const timer = setTimeout(() => setTimedOut(true), 12000);
    return () => clearTimeout(timer);
  }, [episode, loading, status.isLoaded, status.error]);
  const openEpisode = useCallback(
    async (id: string, force = false) => {
      if (
        !force &&
        currentEpisode.current?.id === id &&
        player.isLoaded &&
        Date.parse(currentEpisode.current.expiresAt) > Date.now()
      )
        return;
      audioRequest.current?.abort();
      const controller = new AbortController();
      audioRequest.current = controller;
      ++playbackRequest.current;
      claimPlayback('podcast');
      player.pause();
      savePosition();
      canSavePosition.current = false;
      setPositionReady(false);
      player.replace(null);
      setEpisode(null);
      currentEpisode.current = null;
      setLoading(true);
      setAudioError(null);
      setTimedOut(false);
      setStarting(false);
      try {
        if (!backendConnection) throw new ApiFault('generation_unavailable', 503);
        const selected = await getEpisode(backendConnection, id, controller.signal);
        const audio = await getAudio(backendConnection, id, controller.signal);
        if (controller.signal.aborted) return;
        setEpisode(selected);
        currentEpisode.current = selected;
        player.replace({ uri: audio.url });
      } catch (error) {
        if (!controller.signal.aborted) setAudioError(safeError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [player, savePosition],
  );
  async function toggle() {
    if (status.playing) {
      player.pause();
      savePosition();
      return;
    }
    const selected = episode;
    if (!selected || !status.isLoaded || loading || starting) return;
    const request = ++playbackRequest.current;
    setStarting(true);
    setAudioError(null);
    try {
      if (Date.parse(selected.expiresAt) <= Date.now()) throw new ApiFault('not_found', 404);
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: nativeAudioControls,
        interruptionMode: 'doNotMix',
      });
      if (request !== playbackRequest.current) return;
      const item = saved.current.find((item) => item.id === selected.id);
      const position = player.currentTime > 0.1 ? player.currentTime : item?.position || 0;
      const start = position >= status.duration - 0.25 ? 0 : Math.min(position, status.duration);
      await player.seekTo(start);
      if (request !== playbackRequest.current) return;
      canSavePosition.current = true;
      setPositionReady(true);
      claimPlayback('podcast');
      if (nativeAudioControls)
        player.setActiveForLockScreen(true, {
          title: selected.title,
          artist: 'AXIOM · Narração por IA',
        });
      player.play();
      setHistory((items) =>
        [
          {
            id: selected.id,
            topicId: selected.topicId,
            title: selected.title,
            duration: selected.durationSeconds,
            position: start,
            playedAt: new Date().toISOString(),
            generatedAt: selected.generatedAt,
          },
          ...items.filter((item) => item.id !== selected.id),
        ].slice(0, 40),
      );
    } catch (error) {
      if (request === playbackRequest.current) setAudioError(safeError(error));
    } finally {
      if (request === playbackRequest.current) setStarting(false);
    }
  }
  async function seek(position: number) {
    if (!status.isLoaded || !episode || starting) return;
    try {
      await player.seekTo(Math.max(0, Math.min(status.duration, position)));
      canSavePosition.current = true;
      setPositionReady(true);
      savePosition();
    } catch {
      setAudioError('Não foi possível mudar o ponto de reprodução.');
    }
  }
  function clearHistory() {
    ++playbackRequest.current;
    player.pause();
    if (nativeAudioControls) player.setActiveForLockScreen(false);
    player.replace(null);
    canSavePosition.current = false;
    setPositionReady(false);
    setEpisode(null);
    currentEpisode.current = null;
    setHistory([]);
    saved.current = [];
  }
  return {
    preparation,
    begin,
    episode,
    openEpisode,
    history,
    hydrated,
    storageError,
    loading,
    status: {
      ...status,
      currentTime: positionReady
        ? status.currentTime
        : history.find((item) => item.id === episode?.id)?.position || 0,
    },
    starting,
    toggle,
    seek,
    clearHistory,
    audioError:
      audioError ||
      (status.error
        ? 'Não foi possível carregar o áudio. Renove o acesso e tente novamente.'
        : null) ||
      (timedOut && !status.isLoaded
        ? 'O carregamento demorou. Tente renovar o acesso ao áudio.'
        : null),
  };
}
type Value = ReturnType<typeof usePodcastValue>;
const PodcastContext = createContext<Value | null>(null);
export function PodcastProvider({ children }: { children: ReactNode }) {
  const value = usePodcastValue();
  return <PodcastContext value={value}>{children}</PodcastContext>;
}
export function usePodcast() {
  const value = use(PodcastContext);
  if (!value) throw new Error('PodcastProvider ausente.');
  return value;
}
