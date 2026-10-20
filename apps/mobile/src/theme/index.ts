import type { TextStyle } from 'react-native';
export const palettes = {
  dark: {
    background: '#0B1020',
    surface: '#151D30',
    elevated: '#1C2740',
    text: '#F8FAFC',
    secondary: '#CBD5E1',
    muted: '#94A3B8',
    accent: '#67E8F9',
    onAccent: '#0B1020',
    line: '#29344B',
    notice: '#FBBF24',
  },
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    elevated: '#E8EDF4',
    text: '#0F172A',
    secondary: '#475569',
    muted: '#526278',
    accent: '#0E7490',
    onAccent: '#FFFFFF',
    line: '#D6DEE8',
    notice: '#854D0E',
  },
};
export const spacing = {
  xs: 4,
  sm: 8,
  compact: 12,
  md: 16,
  wide: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
  hero: 64,
};
export const radius = { sm: 8, md: 12, lg: 20, full: 9999 };
export const sizes = { content: 680, icon: 22, touch: 48, play: 80, artwork: 184, waveWidth: 5 };
export const typography = {
  hero: { fontSize: 38, lineHeight: 44, fontWeight: '700', letterSpacing: -1.1 },
  title: { fontSize: 26, lineHeight: 33, fontWeight: '700', letterSpacing: -0.5 },
  headline: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 23 },
  caption: { fontSize: 12, lineHeight: 18 },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 1.8 },
  brand: { fontSize: 21, fontWeight: '700', letterSpacing: 4 },
} as const satisfies Record<string, TextStyle>;
export const waveform = [
  18, 30, 46, 26, 58, 76, 40, 64, 88, 52, 34, 66, 92, 70, 44, 82, 58, 36, 74, 50, 28, 60, 40, 24,
];
