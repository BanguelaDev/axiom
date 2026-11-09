import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '@/state/app-state';
import { typography } from '@/theme';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { initializeBackend, setAuthActive, subscribeBackend } from '@/services/backend';
import { PodcastProvider } from '@/state/podcast-state';
function Navigation() {
  const { colors, scheme } = useApp();
  useEffect(() => {
    setAuthActive(AppState.currentState === 'active');
    const listener = AppState.addEventListener('change', (state) =>
      setAuthActive(state === 'active'),
    );
    return () => {
      listener.remove();
      setAuthActive(false);
    };
  }, []);
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerTitleStyle: typography.headline,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="topic/[id]"
          options={{ title: 'Escolha seu assunto', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="prepare/[id]"
          options={{ title: 'Preparando a experiência', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen name="episode/[id]" options={{ title: 'Seu podcast' }} />
        <Stack.Screen name="sources/[id]" options={{ title: 'Fontes do episódio' }} />
        <Stack.Screen name="generate/[id]" options={{ title: 'Preparando seu podcast' }} />
        <Stack.Screen name="podcast/[id]" options={{ title: 'Seu podcast' }} />
        <Stack.Screen name="connection" options={{ title: 'Seu computador' }} />
        <Stack.Screen name="feedback/[id]" options={{ title: 'Avaliar episódio' }} />
        <Stack.Screen
          name="prototype"
          options={{ title: 'Apresentação do projeto', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="integration"
          options={{ title: 'Conexão com o servidor', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="selection"
          options={{ title: 'Seleção de notícias', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="editorial"
          options={{ title: 'Revisão do roteiro', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="audio-lab"
          options={{ title: 'Verificação de áudio', headerBackTitle: 'Voltar' }}
        />
      </Stack>
    </>
  );
}
function ConnectedApp() {
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeBackend(() => setRevision((value) => value + 1));
    void initializeBackend().then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  if (!ready) return null;
  return (
    <PodcastProvider key={revision}>
      <Navigation />
    </PodcastProvider>
  );
}
export default function RootLayout() {
  return (
    <AppProvider>
      <ConnectedApp />
    </AppProvider>
  );
}
