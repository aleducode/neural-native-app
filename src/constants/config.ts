// Neural App Configuration

export const API_URL = 'https://app.neural.com.co';
export const API_BASE = `${API_URL}/api/v1`;

export const STORAGE_KEYS = {
  TOKEN: 'neural_token',
  USER: 'neural_user',
} as const;

export const APP_NAME = 'Neural';

// WhatsApp Support - Format: 57{NEURAL_PHONE} (e.g., 573001234567)
// This should match the NEURAL_PHONE environment variable in Django backend
export const NEURAL_PHONE = '3224710677'; // TODO: Update with actual Neural phone number

// Sentry Configuration
// Get your DSN from https://sentry.io/settings/{your-org}/projects/{your-project}/keys/
// Organization: ducode, Project: neural-app
// Configure via EXPO_PUBLIC_SENTRY_DSN environment variable (in .env file or EAS secrets)
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || undefined;
