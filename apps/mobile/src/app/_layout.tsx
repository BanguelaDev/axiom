import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '@/state/app-state';
import { typography } from '@/theme';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { setAuthActive } from '@/services/backend';
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
      </Stack>
    </>
  );
}
export default function RootLayout() {
  return (
    <AppProvider>
      <Navigation />
    </AppProvider>
  );
}
