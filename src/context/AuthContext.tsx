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
import { biometricService } from '../utils/biometrics';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricType: string;
  login: (credentials: LoginRequest, saveForBiometric?: boolean) => Promise<{ success: boolean; error?: string }>;
  loginWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string; errors?: Record<string, string[]> }>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  enableBiometric: (email: string, password: string) => Promise<boolean>;
  disableBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biométrico');

  // Check for existing session and biometric availability on mount
  useEffect(() => {
    checkAuthStatus();
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const available = await biometricService.isAvailable();
    setBiometricAvailable(available);

    if (available) {
      const type = await biometricService.getBiometricType();
      setBiometricType(type);

      const enabled = await biometricService.isEnabled();
      setBiometricEnabled(enabled);
    }
  };

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

  const login = async (
    credentials: LoginRequest,
    saveForBiometric: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error, errors } = await authApi.login(credentials);

    if (data) {
      await setToken(data.token);
      await setUser(data.user);
      setUserState(data.user);

      // Save credentials for biometric login if requested
      if (saveForBiometric && biometricAvailable) {
        await biometricService.saveCredentials(credentials.email, credentials.password);
        setBiometricEnabled(true);
      }

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

  const loginWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
    if (!biometricAvailable) {
      return { success: false, error: 'Biometría no disponible' };
    }

    const hasCredentials = await biometricService.hasStoredCredentials();
    if (!hasCredentials) {
      return { success: false, error: 'No hay credenciales guardadas' };
    }

    const authenticated = await biometricService.authenticate(
      `Usa ${biometricType} para iniciar sesión`
    );

    if (!authenticated) {
      return { success: false, error: 'Autenticación cancelada' };
    }

    const credentials = await biometricService.getCredentials();
    if (!credentials) {
      return { success: false, error: 'Error al obtener credenciales' };
    }

    return login(credentials, false);
  };

  const enableBiometric = async (email: string, password: string): Promise<boolean> => {
    if (!biometricAvailable) return false;

    const authenticated = await biometricService.authenticate(
      `Configura ${biometricType} para inicio rápido`
    );

    if (!authenticated) return false;

    const saved = await biometricService.saveCredentials(email, password);
    if (saved) {
      setBiometricEnabled(true);
    }
    return saved;
  };

  const disableBiometric = async (): Promise<void> => {
    await biometricService.disable();
    setBiometricEnabled(false);
  };

  const register = async (data: RegisterRequest): Promise<{ success: boolean; error?: string; errors?: Record<string, string[]> }> => {
    const { data: responseData, error, errors } = await authApi.register(data);

    // Backend returns success message but NO token - user must login separately
    if (responseData) {
      // Registration successful - but user is NOT authenticated yet
      // They need to login separately
      return { success: true };
    }

    // Return field-specific errors if they exist, otherwise return general error
    if (errors && Object.keys(errors).length > 0) {
      // Don't return general error when there are field-specific errors
      return { success: false, errors };
    }

    // Return general error only if no field-specific errors exist
    return { success: false, error: error || 'Error al registrarse' };
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
    biometricAvailable,
    biometricEnabled,
    biometricType,
    login,
    loginWithBiometric,
    register,
    logout,
    updateUser,
    enableBiometric,
    disableBiometric,
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
