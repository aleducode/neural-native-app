import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { captureException, addBreadcrumb } from './sentry';

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

interface StoredCredentials {
  email: string;
  password: string;
}

export const biometricService = {
  /**
   * Check if device supports biometric authentication
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  },

  /**
   * Get the type of biometric available (Face ID, Touch ID, etc.)
   */
  async getBiometricType(): Promise<string> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Reconocimiento facial';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Huella digital';
    }
    return 'Biométrico';
  },

  /**
   * Authenticate user with biometrics
   */
  async authenticate(promptMessage?: string): Promise<{ success: boolean; error?: string; errorCode?: string }> {
    try {
      // Check if biometrics are still available
      const available = await this.isAvailable();
      if (!available) {
        const errorMsg = 'Biometría no disponible o no configurada';
        captureException(new Error(errorMsg), {
          context: 'biometricAuth',
          errorType: 'biometric_not_available',
          action: 'authenticate',
        });
        return { success: false, error: errorMsg, errorCode: 'NOT_AVAILABLE' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Autenticación requerida',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
        fallbackLabel: 'Usar contraseña',
      });

      if (!result.success) {
        // Track different error scenarios
        let errorCode = 'AUTHENTICATION_FAILED';
        let errorMsg = 'Autenticación biométrica fallida';

        if (result.error === 'user_cancel') {
          errorCode = 'USER_CANCEL';
          errorMsg = 'Autenticación cancelada por el usuario';
          // Don't track cancellations as errors - they're expected
          addBreadcrumb('Biometric authentication cancelled by user', 'auth');
        } else if (result.error === 'user_fallback') {
          errorCode = 'USER_FALLBACK';
          errorMsg = 'Usuario eligió usar contraseña';
          addBreadcrumb('User chose password fallback', 'auth');
        } else if (result.error === 'system_cancel') {
          errorCode = 'SYSTEM_CANCEL';
          errorMsg = 'Autenticación cancelada por el sistema';
          captureException(new Error('Biometric auth cancelled by system'), {
            context: 'biometricAuth',
            errorType: 'system_cancel',
            errorCode: result.error,
            warning: result.warning,
          });
        } else if (result.error === 'passcode_not_set') {
          errorCode = 'PASSCODE_NOT_SET';
          errorMsg = 'No se ha configurado un código de acceso';
          captureException(new Error('Passcode not set on device'), {
            context: 'biometricAuth',
            errorType: 'passcode_not_set',
          });
        } else if (result.error === 'not_available') {
          errorCode = 'NOT_AVAILABLE';
          errorMsg = 'Biometría no disponible';
          captureException(new Error('Biometrics not available'), {
            context: 'biometricAuth',
            errorType: 'not_available',
            errorCode: result.error,
          });
        } else if (result.error === 'not_enrolled') {
          errorCode = 'NOT_ENROLLED';
          errorMsg = 'No hay biometría configurada en el dispositivo';
          captureException(new Error('No biometrics enrolled'), {
            context: 'biometricAuth',
            errorType: 'not_enrolled',
          });
        } else {
          // Unknown error - track it
          captureException(new Error(`Biometric auth failed: ${result.error || 'unknown'}`), {
            context: 'biometricAuth',
            errorType: 'authentication_failed',
            errorCode: result.error,
            warning: result.warning,
          });
        }

        return { success: false, error: errorMsg, errorCode };
      }

      addBreadcrumb('Biometric authentication successful', 'auth');
      return { success: true };
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      // Track unexpected errors
      captureException(error as Error, {
        context: 'biometricAuth',
        errorType: 'exception',
        errorMessage: error?.message,
        errorCode: error?.code,
      });

      return { 
        success: false, 
        error: 'Error inesperado durante autenticación biométrica',
        errorCode: 'EXCEPTION',
      };
    }
  },

  /**
   * Store credentials securely for biometric login
   */
  async saveCredentials(email: string, password: string): Promise<boolean> {
    try {
      const credentials: StoredCredentials = { email, password };
      await SecureStore.setItemAsync(
        BIOMETRIC_CREDENTIALS_KEY,
        JSON.stringify(credentials)
      );
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    } catch (error) {
      console.error('Error saving credentials:', error);
      return false;
    }
  },

  /**
   * Get stored credentials after biometric authentication
   */
  async getCredentials(): Promise<StoredCredentials | null> {
    try {
      const credentialsJson = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      if (!credentialsJson) return null;
      return JSON.parse(credentialsJson) as StoredCredentials;
    } catch (error) {
      console.error('Error getting credentials:', error);
      return null;
    }
  },

  /**
   * Check if biometric login is enabled
   */
  async isEnabled(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return false;
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  },

  /**
   * Disable biometric login and clear stored credentials
   */
  async disable(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    } catch (error) {
      console.error('Error disabling biometrics:', error);
    }
  },

  /**
   * Check if there are stored credentials
   */
  async hasStoredCredentials(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return false;
      const credentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      return !!credentials;
    } catch (error) {
      return false;
    }
  },
};
