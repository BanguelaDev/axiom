import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { ApiFault } from '@axiom/core/api';
import { inspectApi, type ApiConnection } from '@axiom/core/api-client';
import { normalizeLocalServerUrl } from '@axiom/core/server-config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const localServerEnabled =
  !supabaseUrl && (__DEV__ || process.env.EXPO_PUBLIC_LOCAL_SERVER === 'true');
const configuredUrl =
  process.env.EXPO_PUBLIC_LOCAL_API_URL ||
  (__DEV__ && process.env.EXPO_OS === 'web' ? 'http://127.0.0.1:8787' : null);
const serverKey = 'axiom:local-server:v1';
let localUrl = localServerEnabled ? configuredUrl : null;
const listeners = new Set<() => void>();
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

function localConnection(url: string): ApiConnection {
  let tokenRequest: Promise<string> | null = null;
  let session: { token: string; expires: number } | null = null;
  let loaded = false;
  const key = `axiom:local-session:v2:${encodeURIComponent(url)}`;
  const renewSession = () => {
    session = null;
    loaded = true;
    void AsyncStorage.removeItem(key).catch(() => {});
    void AsyncStorage.removeItem('axiom:local-session:v1').catch(() => {});
  };
  async function getToken(): Promise<string> {
    if (tokenRequest) return tokenRequest;
    tokenRequest = (async () => {
      if (!loaded) {
        loaded = true;
        try {
          const raw =
            (await AsyncStorage.getItem(key)) ||
            (await AsyncStorage.getItem('axiom:local-session:v1'));
          const saved = raw ? JSON.parse(raw) : null;
          if (
            saved?.url === url &&
            /^[a-f0-9]{64}$/.test(saved.token) &&
            Number.isFinite(saved.expires) &&
            saved.expires > Date.now() &&
            saved.expires <= Date.now() + 3_600_000
          )
            session = saved;
        } catch {
          /* Uma sessão inválida não impede uma conexão nova. */
        }
      }
      if (session && session.expires > Date.now()) return session.token;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`${url}/dev/session`, {
          method: 'POST',
          signal: controller.signal,
        });
        if (!response.ok) throw new ApiFault('unauthorized', 401);
        const result = await response.json();
        if (
          !/^[a-f0-9]{64}$/.test(result.accessToken) ||
          !Number.isFinite(result.expiresIn) ||
          result.expiresIn <= 30 ||
          result.expiresIn > 3600
        )
          throw new ApiFault('unauthorized', 401);
        session = {
          token: result.accessToken,
          expires: Date.now() + (result.expiresIn - 30) * 1000,
        };
        await AsyncStorage.setItem(key, JSON.stringify({ ...session, url })).catch(() => {});
        return session.token;
      } finally {
        clearTimeout(timer);
      }
    })();
    try {
      return await tokenRequest;
    } finally {
      tokenRequest = null;
    }
  }
  return { url, getToken, renewSession };
}

function makeConnection(): ApiConnection | null {
  if (localServerEnabled && localUrl) return localConnection(localUrl.replace(/\/$/, ''));
  if (!client || !supabaseUrl || !publishableKey) return null;
  return {
    url: `${supabaseUrl}/functions/v1/axiom`,
    headers: { apikey: publishableKey },
    getToken: async () => {
      const current = await client.auth.getSession();
      if (current.error) throw new ApiFault('unauthorized', 401);
      if (current.data.session) return current.data.session.access_token;
      const created = await client.auth.signInAnonymously();
      if (created.error || !created.data.session) throw new ApiFault('unauthorized', 401);
      return created.data.session.access_token;
    },
  };
}
export let backendConnection = makeConnection();
export let backendMode = backendConnection
  ? localServerEnabled
    ? 'local'
    : 'supabase'
  : 'unconfigured';
let initialization: Promise<void> | null = null;
export function initializeBackend(): Promise<void> {
  initialization ??= (async () => {
    if (!localServerEnabled) return;
    try {
      const saved = await AsyncStorage.getItem(serverKey);
      if (saved) localUrl = normalizeLocalServerUrl(saved, process.env.EXPO_OS === 'web');
    } catch {
      /* Mantém a configuração de desenvolvimento quando o valor salvo é inválido. */
    }
    backendConnection = makeConnection();
    backendMode = backendConnection ? 'local' : 'unconfigured';
  })();
  return initialization;
}
export const getLocalServerUrl = () => localUrl;
export function subscribeBackend(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export async function setLocalServerUrl(value: string): Promise<void> {
  if (!localServerEnabled) throw new Error('Esta versão não permite alterar o servidor local.');
  const url = normalizeLocalServerUrl(value, process.env.EXPO_OS === 'web');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const candidate = localConnection(url);
  try {
    await inspectApi(candidate, controller.signal);
  } catch {
    throw new Error(
      'Não encontramos o AXIOM nesse endereço. Confira o servidor, o Wi-Fi e a permissão de rede do computador.',
    );
  } finally {
    clearTimeout(timer);
  }
  await AsyncStorage.setItem(serverKey, url);
  localUrl = url;
  backendConnection = candidate;
  backendMode = 'local';
  for (const listener of listeners) listener();
}
export function setAuthActive(active: boolean) {
  if (!client || process.env.EXPO_OS === 'web') return;
  if (active) client.auth.startAutoRefresh();
  else client.auth.stopAutoRefresh();
}
export function forgetLocalSession() {
  backendConnection?.renewSession?.();
}
