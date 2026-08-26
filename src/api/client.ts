import { Platform } from 'react-native';
import { API_BASE } from '../constants/config';
import { getToken, clearAuthData } from '../utils/storage';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

/**
 * Coerce whatever the API put in an error field into a string.
 *
 * Django REST Framework answers with `{"detail": ["Credenciales inválidas"]}`,
 * and handing that array to Alert.alert crashes iOS with
 * "-[__NSSingleObjectArrayI length]: unrecognized selector".
 */
function asMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value || undefined;
  if (Array.isArray(value)) return asMessage(value[0]);
  return undefined;
}

class ApiClient {
  private baseUrl: string;
  private onUnauthorized?: () => void;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorized = callback;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options;

    const token = await getToken();

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Token ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle 204 No Content
      if (response.status === 204) {
        return { data: undefined };
      }

      // Handle 401 Unauthorized before parsing
      if (response.status === 401) {
        await clearAuthData();
        this.onUnauthorized?.();
        return { error: 'Sesión expirada. Inicia sesión nuevamente.' };
      }

      // Try to parse JSON, handle non-JSON responses
      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        // Response is not JSON (likely HTML error page)
        console.error('Non-JSON response:', text.substring(0, 200));
        return { error: `Error del servidor (${response.status})` };
      }

      if (!response.ok) {
        // Check if errors are in data.errors or directly in data (Django REST framework format)
        // Django REST framework returns errors directly in the response object like:
        // { "email": ["error1"], "password": ["error2"] }
        let errors: Record<string, string[]> | undefined;
        
        // Fields that are NOT field-specific errors (general error fields)
        const generalErrorFields = ['detail', 'message', 'non_field_errors', 'error'];
        
        if (data.errors) {
          // Errors are in data.errors
          errors = data.errors;
        } else {
          // Check if there are field-specific errors directly in data object
          // Django REST Framework validation errors come as field names with array/string values
          const fieldErrors: Record<string, string[]> = {};
          let hasFieldErrors = false;
          
          Object.keys(data).forEach((key) => {
            // Skip general error fields
            if (generalErrorFields.includes(key)) {
              return;
            }
            
            // Check if this looks like a field error (array or string)
            if (Array.isArray(data[key]) && data[key].length > 0) {
              // All array items should be strings
              if (data[key].every(item => typeof item === 'string')) {
                fieldErrors[key] = data[key];
                hasFieldErrors = true;
              }
            } else if (typeof data[key] === 'string' && data[key].length > 0) {
              // Single string error
              fieldErrors[key] = [data[key]];
              hasFieldErrors = true;
            }
          });
          
          if (hasFieldErrors) {
            errors = fieldErrors;
          }
        }
        
        // Only set general error if no field-specific errors exist
        const generalError = errors && Object.keys(errors).length > 0
          ? undefined
          : (asMessage(data.message) || asMessage(data.detail) || asMessage(data.error) || 'Error en la solicitud');
        
        return {
          error: generalError,
          errors,
        };
      }

      return { data };
    } catch (error) {
      console.error('API Error:', error);
      return {
        error: 'Error de conexión. Verifica tu internet.',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', body });
  }

  async uploadFile<T>(endpoint: string, fileUri: string, fileName: string, mimeType: string): Promise<ApiResponse<T>> {
    const token = await getToken();

    const formData = new FormData();

    if (Platform.OS === 'web') {
      // Web: fetch the file and create a Blob
      try {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        formData.append('photo', blob, fileName);
      } catch (e) {
        console.error('Error creating blob:', e);
        return { error: 'Error al procesar la imagen' };
      }
    } else {
      // iOS/Android: Use React Native's non-standard FormData format
      const uri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
      formData.append('photo', {
        uri: uri,
        type: mimeType,
        name: fileName,
      } as any);
    }

    try {
      // Don't set Content-Type - let fetch set it with proper boundary
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers,
        body: formData,
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse response:', responseText);
        return { error: 'Error en la respuesta del servidor' };
      }

      if (!response.ok) {
        if (response.status === 401) {
          await clearAuthData();
          this.onUnauthorized?.();
        }

        if (data.photo) {
          return { error: asMessage(data.photo) };
        }

        return {
          error: asMessage(data.message) || asMessage(data.detail) || 'Error en la solicitud',
          errors: data.errors || data,
        };
      }

      return { data };
    } catch (error) {
      console.error('API Upload Error:', error);
      return { error: 'Error de conexión. Verifica tu internet.' };
    }
  }
}

export const api = new ApiClient(API_BASE);
export default api;
