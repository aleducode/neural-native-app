import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
  async authenticate(promptMessage?: string): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Autenticación requerida',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
        fallbackLabel: 'Usar contraseña',
      });
      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
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
