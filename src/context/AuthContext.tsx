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
import { captureException, setUserContext, clearUserContext, addBreadcrumb } from '../utils/sentry';

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
          // Set user context in Sentry if we have cached user
          setUserContext({ id: cachedUser.id, email: cachedUser.email });
        }

        // Verify token is still valid by fetching current user
        const { data, error } = await authApi.getMe();

        if (data) {
          setUserState(data);
          await setUser(data);
          // Update user context in Sentry
          setUserContext({ id: data.id, email: data.email });
        } else if (error) {
          // Token invalid, clear auth data
          await clearAuthData();
          setUserState(null);
          clearUserContext();
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      captureException(error as Error, {
        context: 'checkAuthStatus',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    credentials: LoginRequest,
    saveForBiometric: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error, errors } = await authApi.login(credentials);

      if (data) {
        await setToken(data.token);
        await setUser(data.user);
        setUserState(data.user);

        // Set user context in Sentry for error tracking
        setUserContext({
          id: data.user.id,
          email: data.user.email,
          username: data.user.username || data.user.email,
        });

        // Save credentials for biometric login if requested
        if (saveForBiometric && biometricAvailable) {
          try {
            await biometricService.saveCredentials(credentials.email, credentials.password);
            setBiometricEnabled(true);
          } catch (bioError) {
            // Log but don't fail the login
            captureException(bioError as Error, {
              context: 'saveBiometricCredentials',
              userId: data.user.id,
            });
          }
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
    } catch (error) {
      // Capture unexpected errors during login
      captureException(error as Error, {
        context: 'login',
        email: credentials.email,
      });
      return { success: false, error: 'Error inesperado al iniciar sesión' };
    }
  };

  const loginWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!biometricAvailable) {
        return { success: false, error: 'Biometría no disponible' };
      }

      const hasCredentials = await biometricService.hasStoredCredentials();
      if (!hasCredentials) {
        return { success: false, error: 'No hay credenciales guardadas' };
      }

      const authResult = await biometricService.authenticate(
        `Usa ${biometricType} para iniciar sesión`
      );

      if (!authResult.success) {
        // Don't return error if user cancelled - it's expected behavior
        if (authResult.errorCode === 'USER_CANCEL') {
          return { success: false, error: 'Autenticación cancelada' };
        }
        // For other errors, return the specific error message
        return { success: false, error: authResult.error || 'Error en autenticación biométrica' };
      }

      const credentials = await biometricService.getCredentials();
      if (!credentials) {
        captureException(new Error('Failed to get credentials from secure storage'), {
          context: 'loginWithBiometric',
          biometricType,
        });
        return { success: false, error: 'Error al obtener credenciales' };
      }

      return login(credentials, false);
    } catch (error) {
      captureException(error as Error, {
        context: 'loginWithBiometric',
        biometricType,
      });
      return { success: false, error: 'Error al autenticar con biometría' };
    }
  };

  const enableBiometric = async (email: string, password: string): Promise<boolean> => {
    if (!biometricAvailable) return false;

    const authResult = await biometricService.authenticate(
      `Configura ${biometricType} para inicio rápido`
    );

    if (!authResult.success) {
      // Don't track user cancellations as errors
      if (authResult.errorCode !== 'USER_CANCEL') {
        captureException(new Error(authResult.error || 'Biometric setup failed'), {
          context: 'enableBiometric',
          errorCode: authResult.errorCode,
        });
      }
      return false;
    }

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
      captureException(error as Error, {
        context: 'logout',
      });
    } finally {
      await clearAuthData();
      setUserState(null);
      clearUserContext(); // Clear Sentry user context
      addBreadcrumb('User logged out', 'auth');
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
