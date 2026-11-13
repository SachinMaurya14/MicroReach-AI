import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost } from '../services/api/client';

export interface BackendHealthStatus {
  status: 'ok';
  demoAccessConfigured: boolean;
  supabaseConfigured: boolean;
  youtubeConfigured: boolean;
  geminiConfigured: boolean;
  geminiModel: string;
  outreachMode: 'simulation' | 'live';
  gmailOAuthConfigured: boolean;
  encryptionKeyConfigured: boolean;
}

interface DemoSessionResponse {
  authenticated: boolean;
  demoAccessConfigured: boolean;
  expiresAt?: string;
  workspaceMode: 'shared_demo';
  health: BackendHealthStatus;
}

interface DemoSessionContextValue {
  loading: boolean;
  authenticated: boolean;
  demoAccessConfigured: boolean;
  expiresAt: string | null;
  health: BackendHealthStatus | null;
  refreshSession: () => Promise<DemoSessionResponse | null>;
  exchangeAccessToken: (token: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logoutDemoSession: () => Promise<void>;
}

const DemoSessionContext = createContext<DemoSessionContextValue>({
  loading: true,
  authenticated: false,
  demoAccessConfigured: false,
  expiresAt: null,
  health: null,
  refreshSession: async () => null,
  exchangeAccessToken: async () => ({ ok: false, message: 'Not initialized.' }),
  logoutDemoSession: async () => {},
});

export const DemoSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [demoAccessConfigured, setDemoAccessConfigured] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [health, setHealth] = useState<BackendHealthStatus | null>(null);

  const refreshSession = useCallback(async (): Promise<DemoSessionResponse | null> => {
    setLoading(true);
    try {
      const data = await apiGet<DemoSessionResponse>('/api/demo/session');
      setAuthenticated(Boolean(data.authenticated));
      setDemoAccessConfigured(Boolean(data.demoAccessConfigured));
      setExpiresAt(data.expiresAt ?? null);
      setHealth(data.health ?? null);
      return data;
    } catch {
      setAuthenticated(false);
      setExpiresAt(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const exchangeAccessToken = useCallback(
    async (token: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      try {
        await apiPost<{ authenticated: boolean }>('/api/demo/access', { token });
        await refreshSession();
        return { ok: true };
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to verify invitation link.';
        return { ok: false, message };
      }
    },
    [refreshSession]
  );

  const logoutDemoSession = useCallback(async () => {
    try {
      await apiPost('/api/demo/logout');
    } finally {
      setAuthenticated(false);
      setExpiresAt(null);
    }
  }, []);

  return (
    <DemoSessionContext.Provider
      value={{
        loading,
        authenticated,
        demoAccessConfigured,
        expiresAt,
        health,
        refreshSession,
        exchangeAccessToken,
        logoutDemoSession,
      }}
    >
      {children}
    </DemoSessionContext.Provider>
  );
};

export function useDemoSession(): DemoSessionContextValue {
  return useContext(DemoSessionContext);
}
