// Neural App Configuration

/**
 * Where the app talks to. Production by default; set EXPO_PUBLIC_API_URL in
 * .env to point a development build at a backend running on your machine —
 * use the Mac's LAN address, not localhost, because the phone resolves
 * localhost to itself.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://app.neural.com.co';
export const API_BASE = `${API_URL}/api/v1`;

export const STORAGE_KEYS = {
  TOKEN: 'neural_token',
  USER: 'neural_user',
} as const;

export const APP_NAME = 'Neural';

/**
 * The gym's WhatsApp, without the country code — the links add `57`.
 *
 * Confirmed as the real number. It has to match `NEURAL_PHONE` in the Django
 * backend, which builds its own WhatsApp links for the same conversations.
 */
export const NEURAL_PHONE = '3137141228';

// Sentry Configuration
// Get your DSN from https://sentry.io/settings/{your-org}/projects/{your-project}/keys/
// Organization: ducode, Project: neural-app
// Configure via EXPO_PUBLIC_SENTRY_DSN environment variable (in .env file or EAS secrets)
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || undefined;
