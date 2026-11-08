import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '@/state/app-state';
import { typography } from '@/theme';
function Navigation() {
  const { colors, scheme } = useApp();
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
