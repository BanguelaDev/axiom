import { Tabs } from 'expo-router';
import { Icon } from '@/components/ui';
import { useApp } from '@/state/app-state';
import { typography } from '@/theme';
export default function TabsLayout() {
  const { colors } = useApp();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: typography.brand,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.line },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'AXIOM',
          tabBarLabel: 'Explorar',
          tabBarIcon: ({ color }) => (
            <Icon
              name="compass-outline"
              symbol="safari"
              color={typeof color === 'string' ? color : colors.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          headerTitleStyle: typography.headline,
          tabBarLabel: 'Histórico',
          tabBarIcon: ({ color }) => (
            <Icon
              name="history"
              symbol="clock"
              color={typeof color === 'string' ? color : colors.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Preferências',
          headerTitleStyle: typography.headline,
          tabBarLabel: 'Preferências',
          tabBarIcon: ({ color }) => (
            <Icon
              name="tune-variant"
              symbol="slider.horizontal.3"
              color={typeof color === 'string' ? color : colors.accent}
            />
          ),
        }}
      />
    </Tabs>
  );
}
