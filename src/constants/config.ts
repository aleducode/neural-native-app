// Neural App Configuration

// Para desarrollo local usar la IP de tu máquina (no localhost en dispositivo físico)
// Ejemplo: 'http://192.168.1.X:8000'
export const API_URL = 'http://localhost:8000';
export const API_BASE = `${API_URL}/api/v1`;

export const STORAGE_KEYS = {
  TOKEN: 'neural_token',
  USER: 'neural_user',
} as const;

export const APP_NAME = 'Neural';

// WhatsApp Support - Format: 57{NEURAL_PHONE} (e.g., 573001234567)
// This should match the NEURAL_PHONE environment variable in Django backend
export const NEURAL_PHONE = '3001234567'; // TODO: Update with actual Neural phone number
