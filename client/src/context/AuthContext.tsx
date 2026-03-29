import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UserDTO } from '../services/api';
import { loginRequest, registerRequest, setAuthToken } from '../services/api';

const STORAGE_KEY = 'signbridge_token';
const USER_KEY = 'signbridge_user';

type AuthState = {
  user: UserDTO | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (p: {
    name: string;
    email: string;
    password: string;
    role: 'interviewer' | 'candidate';
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>({
    id: 'guest-id',
    name: 'Guest User',
    email: 'guest@example.com',
    role: 'candidate',
  });
  const [token, setToken] = useState<string | null>('guest-token');


  useEffect(() => {
    // Guest Mode: Automatically set auth token
    setAuthToken('guest-token');
  }, []);
  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    localStorage.setItem(STORAGE_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (p: { name: string; email: string; password: string; role: 'interviewer' | 'candidate' }) => {
      const data = await registerRequest(p);
      localStorage.setItem(STORAGE_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading: false, login, register, logout }),
    [user, token, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
