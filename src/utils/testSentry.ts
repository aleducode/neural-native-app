/**
 * Utilidades para probar Sentry en desarrollo
 * Solo usa estas funciones para testing - NO incluir en producción
 */

import { captureException, captureMessage, addBreadcrumb } from './sentry';

/**
 * Forzar un error de prueba para verificar que Sentry está funcionando
 */
export function testSentryError() {
  try {
    // Simular un error de login
    throw new Error('Test error from login screen - Sentry is working!');
  } catch (error) {
    captureException(error as Error, {
      context: 'testSentry',
      screen: 'LoginScreen',
      action: 'test_error',
    });
  }
}

/**
 * Simular un error de red durante el login
 */
export function testNetworkError() {
  try {
    throw new Error('Network request failed: Connection timeout');
  } catch (error) {
    captureException(error as Error, {
      context: 'testSentry',
      screen: 'LoginScreen',
      errorType: 'network_error',
      endpoint: '/api/v1/auth/login/',
    });
  }
}

/**
 * Simular un error de validación
 */
export function testValidationError() {
  try {
    const error = new Error('Invalid credentials');
    error.name = 'ValidationError';
    throw error;
  } catch (error) {
    captureException(error as Error, {
      context: 'testSentry',
      screen: 'LoginScreen',
      errorType: 'validation_error',
      email: 'test@example.com',
    });
  }
}

/**
 * Test completo: simular un flujo de login con error
 */
export function testLoginFlowError() {
  // Agregar breadcrumbs como si fuera un flujo real
  addBreadcrumb('User opened login screen', 'navigation');
  addBreadcrumb('User entered email', 'user_action', { email: 'test@example.com' });
  addBreadcrumb('User clicked login button', 'user_action');
  
  // Simular error después del intento de login
  setTimeout(() => {
    try {
      throw new Error('Login failed: Unexpected error during authentication');
    } catch (error) {
      captureException(error as Error, {
        context: 'testSentry',
        screen: 'LoginScreen',
        action: 'handleLogin',
        email: 'test@example.com',
        hasBiometric: false,
      });
    }
  }, 100);
}

/**
 * Enviar un mensaje de prueba (no es un error)
 */
export function testSentryMessage() {
  captureMessage('Test message from login screen - Sentry tracking is active', 'info', {
    screen: 'LoginScreen',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Simular error cuando se deniegan permisos de biometría
 */
export function testBiometricPermissionDenied() {
  addBreadcrumb('User attempted biometric login', 'auth');
  
  try {
    throw new Error('Biometric permission denied by system');
  } catch (error) {
    captureException(error as Error, {
      context: 'biometricAuth',
      errorType: 'permission_denied',
      errorCode: 'PERMISSION_DENIED',
      biometricType: 'Face ID',
      action: 'authenticate',
    });
  }
}

/**
 * Simular error cuando se deniegan permisos de notificaciones
 */
export function testNotificationPermissionDenied() {
  addBreadcrumb('App attempted to request notification permissions', 'notifications');
  
  try {
    throw new Error('Notification permission denied by user');
  } catch (error) {
    captureException(error as Error, {
      context: 'pushNotifications',
      errorType: 'permission_denied',
      permissionStatus: 'denied',
      action: 'requestPermissions',
    });
  }
}
