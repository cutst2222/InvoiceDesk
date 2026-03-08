import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
  updateMyProfileRequest,
} from '../services/authService.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await meRequest();
      setUser(response.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const register = async (payload) => {
    const response = await registerRequest(payload);
    return response;
  };

  const login = async (payload) => {
    const response = await loginRequest(payload);
    setUser(response.user);
    return response.user;
  };

  const updateMyProfile = async (payload) => {
    const response = await updateMyProfileRequest(payload);
    setUser(response.user);
    return response.user;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      register,
      login,
      logout,
      refreshUser,
      updateMyProfile,
    }),
    [user, loading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
