import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { login as apiLogin, getMe, register as apiRegister } from '../api/auth';
import type { UserInfo } from '@shared/api.interface';
import { ensureInitialized } from '../db/local-db';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const STORAGE_VERSION_KEY = 'auth_storage_version';
const CURRENT_STORAGE_VERSION = '1';

interface AuthContextValue {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (u: string, p: string, dn?: string) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const clearStaleAuth = (): void => {
  try {
    const version = localStorage.getItem(STORAGE_VERSION_KEY);
    if (version !== CURRENT_STORAGE_VERSION) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
      return;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && typeof token !== 'string') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }): React.ReactElement => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async (): Promise<void> => {
    ensureInitialized();
    clearStaleAuth();
    const savedToken: string | null = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setIsLoading(false);
      return;
    }
    try {
      setToken(savedToken);
      const current: UserInfo = await getMe();
      setUser(current);
      localStorage.setItem(USER_KEY, JSON.stringify(current));
    } catch (err: unknown) {
      logger.error('checkAuth failed', err);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    const cleanUsername: string = username.trim();
    const cleanPassword: string = password;
    const res = await apiLogin(cleanUsername, cleanPassword);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  };

  const logout = (): void => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const register = async (
    username: string,
    password: string,
    displayName?: string,
  ): Promise<void> => {
    await apiRegister(username.trim(), password, displayName?.trim());
    await login(username, password);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, logout, register, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
