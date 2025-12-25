import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import healthKitService, { HealthData } from '../services/healthKit';

export interface UseHealthKitReturn {
  isAvailable: boolean;
  isAuthorized: boolean;
  isLoading: boolean;
  healthData: HealthData | null;
  error: string | null;
  requestPermissions: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useHealthKit(): UseHealthKitReturn {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = healthKitService.isAvailable();

  const refreshData = useCallback(async () => {
    if (!isAvailable || !isAuthorized) {
      console.log('[useHealthKit] refreshData skipped', { isAvailable, isAuthorized });
      return;
    }

    console.log('[useHealthKit] Refreshing health data...');
    setIsLoading(true);
    setError(null);

    try {
      const data = await healthKitService.getTodayHealthData();
      console.log('[useHealthKit] Health data received:', data);
      setHealthData(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al obtener datos de salud';
      console.error('[useHealthKit] Error refreshing data:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, isAuthorized]);

  const requestPermissions = useCallback(async () => {
    console.log('[useHealthKit] requestPermissions called', { isAvailable });
    
    if (!isAvailable) {
      const errorMsg = 'HealthKit solo está disponible en iOS';
      console.log('[useHealthKit]', errorMsg);
      setError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useHealthKit] Calling healthKitService.requestPermissions...');
      const authorized = await healthKitService.requestPermissions();
      console.log('[useHealthKit] Permissions result:', authorized);
      setIsAuthorized(authorized);

      if (authorized) {
        console.log('[useHealthKit] Authorized, refreshing data...');
        setIsAuthorized(true);
        // Call refreshData directly since we just authorized
        setIsLoading(true);
        try {
          const data = await healthKitService.getTodayHealthData();
          console.log('[useHealthKit] Health data received:', data);
          setHealthData(data);
        } catch (err) {
          console.error('[useHealthKit] Error refreshing data:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        const errorMsg = 'No se otorgaron los permisos de HealthKit. Asegúrate de habilitar HealthKit en Xcode.';
        console.log('[useHealthKit]', errorMsg);
        setError(errorMsg);
        Alert.alert('Permisos requeridos', errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al solicitar permisos';
      console.error('[useHealthKit] Error:', err);
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // Auto-refresh data every 5 minutes when authorized
  useEffect(() => {
    if (!isAuthorized || !isAvailable) {
      return;
    }

    refreshData();

    const interval = setInterval(() => {
      refreshData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthorized, isAvailable, refreshData]);

  return {
    isAvailable,
    isAuthorized,
    isLoading,
    healthData,
    error,
    requestPermissions,
    refreshData,
  };
}

