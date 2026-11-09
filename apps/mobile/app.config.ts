import type { ConfigContext, ExpoConfig } from 'expo/config';
import app from './app.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const preset = app.expo as ExpoConfig;
  const local = process.env.EXPO_PUBLIC_LOCAL_SERVER === 'true';
  const plugins = (preset.plugins || []).filter(
    (plugin) => (typeof plugin === 'string' ? plugin : plugin[0]) !== 'expo-build-properties',
  );
  return {
    ...config,
    ...preset,
    plugins: [
      ...plugins,
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: local,
            ...(local ? { buildArchs: ['arm64-v8a', 'x86_64'] } : {}),
          },
        },
      ],
    ],
  };
};
