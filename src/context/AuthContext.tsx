import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginRequest, RegisterRequest } from '../types';
import { authApi } from '../api/auth';
import api from '../api/client';
import {
  getToken,
  setToken,
  getUser,
  setUser,
  clearAuthData,
} from '../utils/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Set up unauthorized callback
  useEffect(() => {
    api.setOnUnauthorized(() => {
      setUserState(null);
    });
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getToken();

      if (token) {
        // Try to get user from storage first
        const cachedUser = await getUser();

        if (cachedUser) {
          setUserState(cachedUser);
        }

        // Verify token is still valid by fetching current user
        const { data, error } = await authApi.getMe();

        if (data) {
          setUserState(data);
          await setUser(data);
        } else if (error) {
          // Token invalid, clear auth data
          await clearAuthData();
          setUserState(null);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<{ success: boolean; error?: string }> => {
    const { data, error, errors } = await authApi.login(credentials);

    if (data) {
      await setToken(data.token);
      await setUser(data.user);
      setUserState(data.user);
      return { success: true };
    }

    // Format error message
    let errorMessage = error || 'Error al iniciar sesión';
    if (errors) {
      const firstError = Object.values(errors)[0];
      if (firstError && firstError.length > 0) {
        errorMessage = firstError[0];
      }
    }

    return { success: false, error: errorMessage };
  };

  const register = async (data: RegisterRequest): Promise<{ success: boolean; error?: string }> => {
    const { data: responseData, error, errors } = await authApi.register(data);

    if (responseData) {
      await setToken(responseData.token);
      await setUser(responseData.user);
      setUserState(responseData.user);
      return { success: true };
    }

    // Format error message
    let errorMessage = error || 'Error al registrarse';
    if (errors) {
      const firstError = Object.values(errors)[0];
      if (firstError && firstError.length > 0) {
        errorMessage = firstError[0];
      }
    }

    return { success: false, error: errorMessage };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await clearAuthData();
      setUserState(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUserState(updatedUser);
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
