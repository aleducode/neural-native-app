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
        return {
          error: data.message || data.detail || 'Error en la solicitud',
          errors: data.errors,
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
          return { error: Array.isArray(data.photo) ? data.photo[0] : data.photo };
        }

        return {
          error: data.message || data.detail || 'Error en la solicitud',
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
