import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { ApiFault } from '@axiom/core/api';
import type { ApiConnection } from '@axiom/core/api-client';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const localUrl =
  process.env.EXPO_PUBLIC_LOCAL_API_URL ||
  (__DEV__ && process.env.EXPO_OS === 'web' ? 'http://127.0.0.1:8787' : undefined);
const useLocal = __DEV__ && !supabaseUrl && !!localUrl;
const client =
  supabaseUrl && publishableKey
    ? createClient(supabaseUrl, publishableKey, {
        auth: {
          storage: process.env.EXPO_OS === 'web' ? undefined : AsyncStorage,
          storageKey: 'axiom:auth:v1',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          lock: processLock,
        },
      })
    : null;
let tokenRequest: Promise<string> | null = null;
let localSession: { token: string; expires: number } | null = null;
let localSessionLoaded = false;
const localSessionKey = 'axiom:local-session:v1';

async function getToken(): Promise<string> {
  if (tokenRequest) return tokenRequest;
  tokenRequest = (async () => {
    if (useLocal && localUrl) {
      if (!localSessionLoaded) {
        localSessionLoaded = true;
        try {
          const raw = await AsyncStorage.getItem(localSessionKey);
          const saved = raw ? JSON.parse(raw) : null;
          if (
            saved?.url === localUrl &&
            /^[a-f0-9]{64}$/.test(saved.token) &&
            Number.isFinite(saved.expires) &&
            saved.expires > Date.now() &&
            saved.expires <= Date.now() + 3_600_000
          )
            localSession = { token: saved.token, expires: saved.expires };
        } catch {
          /* Uma sessão inválida é substituída por outra, sem quebrar o aplicativo. */
        }
      }
      if (localSession && localSession.expires > Date.now()) return localSession.token;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`${localUrl.replace(/\/$/, '')}/dev/session`, {
          method: 'POST',
          signal: controller.signal,
        });
        if (!response.ok) throw new ApiFault('unauthorized', 401);
        const result = await response.json();
        if (typeof result.accessToken !== 'string' || !Number.isFinite(result.expiresIn))
          throw new ApiFault('unauthorized', 401);
        localSession = {
          token: result.accessToken,
          expires: Date.now() + (result.expiresIn - 30) * 1000,
        };
        await AsyncStorage.setItem(
          localSessionKey,
          JSON.stringify({ ...localSession, url: localUrl }),
        ).catch(() => {});
        return localSession.token;
      } finally {
        clearTimeout(timer);
      }
    }
    if (!client) throw new Error('Integração não configurada.');
    const current = await client.auth.getSession();
    if (current.error) throw new ApiFault('unauthorized', 401);
    if (current.data.session) return current.data.session.access_token;
    const created = await client.auth.signInAnonymously();
    if (created.error || !created.data.session) throw new ApiFault('unauthorized', 401);
    return created.data.session.access_token;
  })();
  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

export const backendMode = useLocal ? 'local' : client ? 'supabase' : 'unconfigured';
export const backendConnection: ApiConnection | null =
  useLocal && localUrl
    ? { url: localUrl, getToken, renewSession: forgetLocalSession }
    : client && supabaseUrl && publishableKey
      ? { url: `${supabaseUrl}/functions/v1/axiom`, headers: { apikey: publishableKey }, getToken }
      : null;

/** Um único listener no layout, limpo no desmontar. */
export function setAuthActive(active: boolean) {
  if (!client || process.env.EXPO_OS === 'web') return;
  if (active) client.auth.startAutoRefresh();
  else client.auth.stopAutoRefresh();
}
export function forgetLocalSession() {
  localSession = null;
  localSessionLoaded = true;
  void AsyncStorage.removeItem(localSessionKey).catch(() => {});
}
