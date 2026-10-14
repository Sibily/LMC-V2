import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, getToken } from '../api/client';
import { User, UserSettings } from '../types';
import { reconnectSocket } from '../socket';

interface AuthContextType {
  user: User | null;
  settings: UserSettings | null;
  loading: boolean;
  toast: (msg: string) => void;
  toastMsg: string;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateSettings: (newSettings: { viewMode?: 'management' | 'employee'; customShortcut?: any }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string>('');

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2400);
  };

  const refreshUser = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setSettings(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setSettings(data.settings);
    } catch (err) {
      setToken(null);
      setUser(null);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const data = await api.auth.login(email, pass);
    setToken(data.token);
    setUser(data.user);
    setSettings(data.settings);
    reconnectSocket();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSettings(null);
    reconnectSocket();
  };

  const updateSettings = async (newSettings: { viewMode?: 'management' | 'employee'; customShortcut?: any }) => {
    const data = await api.auth.updateSettings(newSettings);
    setSettings(data as UserSettings);
    toast(newSettings.viewMode === 'management' ? 'Management mode on' : 'Employee mode on');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        settings,
        loading,
        toast,
        toastMsg,
        login,
        logout,
        updateSettings,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
