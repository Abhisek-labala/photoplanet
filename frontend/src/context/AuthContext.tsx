import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Settings } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  settings: Settings | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isServerConnected: boolean;
  isCheckingAuth: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateCurrentUser: (user: User) => void;
  refreshSettings: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('studio_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('studio_token');
  });
  const [settings, setSettings] = useState<Settings | null>(() => {
    const saved = localStorage.getItem('studio_settings');
    return saved ? JSON.parse(saved) : null;
  });
  const [isServerConnected, setIsServerConnected] = useState<boolean>(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  const checkConnection = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setIsServerConnected(true);
        return true;
      } else {
        setIsServerConnected(false);
        return false;
      }
    } catch {
      setIsServerConnected(false);
      return false;
    }
  };

  const refreshSettings = async () => {
    try {
      if (token) {
        const res = await api.getSettings();
        if (res.settings) {
          setSettings(res.settings);
          localStorage.setItem('studio_settings', JSON.stringify(res.settings));
          if (res.settings.studio_name) {
            document.title = `${res.settings.studio_name} - Quotations`;
          }
          return;
        }
      }
      // Fallback to public settings
      const pub = await api.getPublicSettings();
      if (pub) {
        setSettings(prev => ({ ...prev, ...pub }));
        localStorage.setItem('studio_settings', JSON.stringify(pub));
        if (pub.studio_name) {
          document.title = `${pub.studio_name} - Quotations`;
        }
      }
    } catch {
      // Ignore network errors
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await checkConnection();
      await refreshSettings();

      if (token) {
        try {
          const res = await api.getProfile();
          if (res.user) {
            setUser(res.user);
            localStorage.setItem('studio_user', JSON.stringify(res.user));
          }
        } catch {
          // Token expired or invalid
        }
      }
      setIsCheckingAuth(false);
    };

    initAuth();

    // Heartbeat
    const interval = setInterval(() => {
      checkConnection();
    }, 10000);

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', () => setIsServerConnected(false));

    return () => {
      clearInterval(interval);
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', () => setIsServerConnected(false));
    };
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('studio_token', newToken);
    localStorage.setItem('studio_user', JSON.stringify(newUser));
    refreshSettings();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('studio_token');
    localStorage.removeItem('studio_user');
  };

  const updateCurrentUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('studio_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        settings,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'ADMIN',
        isServerConnected,
        isCheckingAuth,
        login,
        logout,
        updateCurrentUser,
        refreshSettings,
        checkConnection
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
