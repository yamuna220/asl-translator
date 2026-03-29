import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createSession, fetchSessions, patchSession, type SessionDTO } from '../services/api';
import { useAuth } from './AuthContext';

type Ctx = {
  sessions: SessionDTO[];
  refresh: () => Promise<void>;
  loading: boolean;
  saveSession: (p: Partial<SessionDTO> & { type: 'live' | 'mock' }) => Promise<SessionDTO | null>;
  updateSession: (id: string, p: Partial<SessionDTO>) => Promise<SessionDTO | null>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setSessions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveSession = useCallback(
    async (p: Partial<SessionDTO> & { type: 'live' | 'mock' }) => {
      if (!token) return null;
      try {
        const doc = await createSession(p);
        setSessions((prev) => [doc, ...prev]);
        return doc;
      } catch {
        return null;
      }
    },
    [token]
  );

  const updateSession = useCallback(
    async (id: string, p: Partial<SessionDTO>) => {
      if (!token) return null;
      try {
        const doc = await patchSession(id, p);
        setSessions((prev) => prev.map((s) => (s._id === id ? doc : s)));
        return doc;
      } catch {
        return null;
      }
    },
    [token]
  );

  const value = useMemo(
    () => ({ sessions, refresh, loading, saveSession, updateSession }),
    [sessions, refresh, loading, saveSession, updateSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionHistory() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionHistory outside SessionProvider');
  return ctx;
}
