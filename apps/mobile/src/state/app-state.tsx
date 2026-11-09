import {
  createContext,
  use,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { getTopic, type TopicId } from '@axiom/core/topics';
import {
  demoGenerationReducer,
  initialDemoGeneration,
  type DemoScenario,
} from '@axiom/core/demo-generation';
import {
  clampPosition,
  parsePreferences,
  resumePosition,
  updateHistoryPosition,
  type HistoryItem,
  type ThemePreference,
} from '@axiom/core/listening';
import { palettes, topicColors } from '@/theme';
import { claimPlayback, registerPlayback } from '@/services/playback';

export type { ThemePreference } from '@axiom/core/listening';
const storageKey = 'axiom:preferences:v1';
const audioSample = require('../../assets/audio/player-test.wav');
function useAppValue() {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemePreference>('dark');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<TopicId | null>(null);
  const [startingPlayback, setStartingPlayback] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [generation, dispatchGeneration] = useReducer(demoGenerationReducer, initialDemoGeneration);
  const player = useAudioPlayer(audioSample, { updateInterval: 250 });
  useEffect(() => registerPlayback('demo', () => player.pause()), [player]);
  const status = useAudioPlayerStatus(player);
  const playRequest = useRef(0);
  const writes = useRef(Promise.resolve());
  const progress = useRef<{ topic: TopicId | null; position: number; starting: boolean }>({
    topic: null,
    position: 0,
    starting: false,
  });
  const scheme =
    themePreference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themePreference;
  useEffect(() => {
    progress.current = {
      topic: activeTopic,
      position: status.currentTime,
      starting: startingPlayback,
    };
  }, [activeTopic, status.currentTime, startingPlayback]);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!alive) return;
        const preferences = parsePreferences(raw);
        setThemePreference(preferences.themePreference);
        setHistory(preferences.history);
      })
      .catch(() => {
        if (alive)
          setStorageError(
            'Não foi possível recuperar as preferências deste aparelho. Você pode continuar usando o app.',
          );
      })
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const payload = JSON.stringify({ themePreference, history });
    // Serializar evita que uma gravação antiga sobrescreva o tema ou histórico mais recente.
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(storageKey, payload))
      .catch(() => setStorageError('Não foi possível salvar as preferências neste aparelho.'));
  }, [hydrated, themePreference, history]);
  const savePosition = useCallback(() => {
    const { topic, position, starting } = progress.current;
    if (topic && !starting) setHistory((items) => updateHistoryPosition(items, topic, position));
  }, []);
  useEffect(() => {
    const interval = setInterval(savePosition, 2000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') savePosition();
    });
    return () => {
      clearInterval(interval);
      listener.remove();
    };
  }, [savePosition]);
  useEffect(() => {
    if (status.isLoaded || status.error) return;
    const timeout = setTimeout(() => setLoadTimedOut(true), 8000);
    return () => clearTimeout(timeout);
  }, [status.isLoaded, status.error, loadAttempt]);
  useEffect(() => {
    if (generation.status !== 'preparing') return;
    // Transição didática do protótipo. Não representa execução de serviços externos.
    const timeout = setTimeout(
      () => dispatchGeneration({ type: 'advance', requestId: generation.requestId }),
      1000,
    );
    return () => clearTimeout(timeout);
  }, [generation.status, generation.step, generation.requestId]);
  async function play(topicId: TopicId) {
    const request = ++playRequest.current;
    setAudioError(null);
    setStartingPlayback(true);
    const previousTopic = activeTopic;
    const previousPosition = clampPosition(player.currentTime);
    player.pause();
    if (previousTopic)
      setHistory((items) => updateHistoryPosition(items, previousTopic, previousPosition));
    try {
      if (!hydrated || !status.isLoaded) throw new Error('Áudio ainda não carregado.');
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      if (request !== playRequest.current) return;
      const saved =
        previousTopic === topicId
          ? previousPosition
          : history.find((item) => item.topicId === topicId)?.position || 0;
      const start = resumePosition(saved, status.duration);
      await player.seekTo(start);
      if (request !== playRequest.current) return;
      if (process.env.EXPO_OS !== 'web')
        player.setActiveForLockScreen(true, {
          title: `Amostra · ${getTopic(topicId)?.name}`,
          artist: 'AXIOM · Demonstração',
        });
      setActiveTopic(topicId);
      claimPlayback('demo');
      player.play();
      setHistory((items) =>
        [
          { topicId, playedAt: new Date().toISOString(), position: start },
          ...items.filter((item) => item.topicId !== topicId),
        ].slice(0, 40),
      );
    } catch {
      if (request === playRequest.current)
        setAudioError('Não foi possível iniciar o áudio. Tente carregar a amostra novamente.');
    } finally {
      if (request === playRequest.current) setStartingPlayback(false);
    }
  }
  function pause() {
    ++playRequest.current;
    player.pause();
    setStartingPlayback(false);
    if (activeTopic)
      setHistory((items) => updateHistoryPosition(items, activeTopic, player.currentTime));
  }
  async function seek(seconds: number) {
    if (!activeTopic || !status.isLoaded || startingPlayback) return;
    try {
      const position = clampPosition(seconds, status.duration);
      await player.seekTo(position);
      setHistory((items) => updateHistoryPosition(items, activeTopic, position));
    } catch {
      setAudioError('Não foi possível mudar o ponto de reprodução. Tente novamente.');
    }
  }
  function retryAudio() {
    pause();
    setAudioError(null);
    setLoadTimedOut(false);
    setLoadAttempt((attempt) => attempt + 1);
    try {
      player.replace(audioSample);
    } catch {
      setAudioError('A amostra não pôde ser carregada. Tente novamente.');
    }
  }
  function clearHistory() {
    ++playRequest.current;
    player.pause();
    if (process.env.EXPO_OS !== 'web') player.setActiveForLockScreen(false);
    progress.current = { topic: null, position: 0, starting: false };
    setStartingPlayback(false);
    setActiveTopic(null);
    setHistory([]);
  }
  function prepareDemo(topicId: TopicId, scenario: DemoScenario = 'ready') {
    dispatchGeneration({ type: 'start', topicId, scenario });
  }
  function cancelDemo() {
    dispatchGeneration({ type: 'cancel', requestId: generation.requestId });
  }
  return {
    themePreference,
    setThemePreference,
    history,
    clearHistory,
    hydrated,
    storageError,
    audioError:
      audioError ||
      (status.error ? 'Não foi possível carregar a amostra de áudio.' : null) ||
      (loadTimedOut && !status.isLoaded
        ? 'O carregamento demorou mais que o esperado. Tente novamente.'
        : null),
    activeTopic,
    player,
    status,
    startingPlayback,
    play,
    pause,
    seek,
    retryAudio,
    generation,
    prepareDemo,
    cancelDemo,
    scheme,
    colors: palettes[scheme],
    topicColors: topicColors[scheme],
  };
}
type AppValue = ReturnType<typeof useAppValue>;
const AppContext = createContext<AppValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppValue();
  return <AppContext value={value}>{children}</AppContext>;
}
export function useApp() {
  const value = use(AppContext);
  if (!value) throw new Error('AppProvider ausente.');
  return value;
}
