import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { palettes } from '@/theme';
import { getTopic, type TopicId } from '@axiom/core/topics';

export type ThemePreference = 'system' | 'light' | 'dark';
type HistoryItem = { topicId: TopicId; playedAt: string; position: number };
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
  const player = useAudioPlayer(audioSample, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const progress = useRef({ topic: activeTopic, position: 0 });
  useEffect(() => {
    progress.current = { topic: activeTopic, position: status.currentTime };
  }, [activeTopic, status.currentTime]);
  const scheme =
    themePreference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themePreference;
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!alive || !raw) return;
        const data = JSON.parse(raw);
        if (['system', 'light', 'dark'].includes(data.themePreference))
          setThemePreference(data.themePreference);
        if (Array.isArray(data.history))
          setHistory(
            data.history
              .filter(
                (item: HistoryItem) =>
                  getTopic(item.topicId) &&
                  typeof item.playedAt === 'string' &&
                  Number.isFinite(item.position),
              )
              .slice(0, 40),
          );
      })
      .catch(() => {
        if (alive) setStorageError('Não foi possível recuperar as preferências deste aparelho.');
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
    AsyncStorage.setItem(storageKey, JSON.stringify({ themePreference, history })).catch(() =>
      setStorageError('Não foi possível salvar as preferências neste aparelho.'),
    );
  }, [hydrated, themePreference, history]);
  useEffect(() => {
    const interval = setInterval(() => {
      const { topic, position } = progress.current;
      if (topic && Number.isFinite(position))
        setHistory((items) =>
          items.some((item) => item.topicId === topic && Math.abs(item.position - position) >= 0.5)
            ? items.map((item) => (item.topicId === topic ? { ...item, position } : item))
            : items,
        );
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  async function play(topicId: TopicId) {
    setAudioError(null);
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      if (
        activeTopic !== topicId ||
        status.didJustFinish ||
        (status.duration > 0 && status.currentTime >= status.duration - 0.1)
      ) {
        const saved = history.find((item) => item.topicId === topicId)?.position || 0;
        await player.seekTo(saved < status.duration - 0.5 ? saved : 0);
      }
      setActiveTopic(topicId);
      if (process.env.EXPO_OS !== 'web')
        player.setActiveForLockScreen(true, {
          title: `Teste de áudio • ${getTopic(topicId)?.name}`,
          artist: 'AXIOM • Demonstração',
        });
      player.play();
      setHistory((items) =>
        [
          { topicId, playedAt: new Date().toISOString(), position: player.currentTime },
          ...items.filter((item) => item.topicId !== topicId),
        ].slice(0, 40),
      );
    } catch {
      setAudioError('Não foi possível iniciar o áudio. Tente reproduzir novamente.');
    }
  }
  async function seek(seconds: number) {
    try {
      await player.seekTo(Math.max(0, Math.min(seconds, status.duration)));
    } catch {
      setAudioError('Não foi possível mudar o ponto de reprodução. Tente novamente.');
    }
  }
  function clearHistory() {
    player.pause();
    setActiveTopic(null);
    setHistory([]);
  }
  return {
    themePreference,
    setThemePreference,
    history,
    clearHistory,
    hydrated,
    storageError,
    audioError,
    activeTopic,
    player,
    status,
    play,
    seek,
    scheme,
    colors: palettes[scheme],
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
