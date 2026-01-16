import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '../constants/config';
import Constants from 'expo-constants';

/**
 * Initialize Sentry for error tracking and crash reporting
 * Call this once at app startup, before rendering any components
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__, // Enable debug mode in development
    environment: __DEV__ ? 'development' : 'production',
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 100% in dev, 20% in production
    beforeSend(event, hint) {
      // Filter out sensitive information
      if (event.request) {
        // Remove sensitive headers
        if (event.request.headers && typeof event.request.headers === 'object') {
          delete (event.request.headers as any)['Authorization'];
          delete (event.request.headers as any)['authorization'];
        }
        // Remove sensitive data from body
        if (event.request.data && typeof event.request.data === 'object' && event.request.data !== null) {
          const sensitiveKeys = ['password', 'token', 'access_token', 'refresh_token'];
          const data = event.request.data as Record<string, any>;
          sensitiveKeys.forEach(key => {
            if (data[key]) {
              data[key] = '[REDACTED]';
            }
          });
        }
      }
      return event;
    },
    // Add app context
    initialScope: {
      contexts: {
        app: {
          app_identifier: Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package,
          app_name: Constants.expoConfig?.name || 'Neural Consciente',
          app_version: Constants.expoConfig?.version || '1.0.0',
        },
      },
    },
  });

  console.log('[Sentry] Initialized successfully');
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      // Group context into a single object for better organization
      // Check if there's a specific context name, otherwise use 'custom'
      const contextName = context.context || 'custom';
      const contextData = { ...context };
      delete contextData.context; // Remove 'context' key as it's used as the name
      scope.setContext(contextName, contextData);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      // Group context into a single object for better organization
      const contextName = context.context || 'custom';
      const contextData = { ...context };
      delete contextData.context;
      scope.setContext(contextName, contextData);
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string | number; email?: string; username?: string }) {
  Sentry.setUser({
    id: String(user.id),
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
}
