import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, ROLES } from '../api/auth.js';
import { profileApi } from '../api/profile.js';
import { getTokens, setTokens, clearTokens, onUnauthorized } from '../api/client.js';

const AuthContext = createContext(null);

const ROLE_NAME_BY_VALUE = Object.fromEntries(Object.entries(ROLES).map(([name, value]) => [value, name]));

export function roleName(role) {
  return ROLE_NAME_BY_VALUE[role] ?? null;
}

export function homePathForRole(role) {
  switch (role) {
    case ROLES.SuperAdmin:
      return '/super-admin';
    case ROLES.RestaurantOwner:
      return '/admin';
    case ROLES.Kitchen:
    case ROLES.Waiter:
      return '/kitchen';
    default:
      return '/';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const tokens = getTokens();
    if (!tokens?.accessToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await profileApi.getMe();
      setUser(profile);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    return onUnauthorized(() => setUser(null));
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const tokens = await authApi.login(email, password);
    setTokens(tokens);
    const profile = await profileApi.getMe();
    setUser(profile);
    return profile;
  }, []);

  const register = useCallback(async (name, email, password, role = ROLES.RestaurantOwner) => {
    const tokens = await authApi.register(name, email, password, role, null);
    setTokens(tokens);
    const profile = await profileApi.getMe();
    setUser(profile);
    return profile;
  }, []);

  /** Self-servis işletme kaydı: hesap, restoran ve deneme aboneliği tek adımda kurulur. */
  const registerBusiness = useCallback(async (payload) => {
    const tokens = await authApi.registerBusiness(payload);
    setTokens(tokens);
    const profile = await profileApi.getMe();
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    const tokens = getTokens();
    try {
      if (tokens?.refreshToken) {
        await authApi.logout(tokens.refreshToken);
      }
    } catch {
      // sunucuya ulaşılamasa bile yerel oturumu temizlemeye devam et
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, register, registerBusiness, logout, refresh: loadUser }),
    [user, isLoading, login, register, registerBusiness, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
