import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../api/client';
import { getToken } from '../utils/storage';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
}

class PushNotificationService {
  private expoPushToken: string | null = null;

  /**
   * Register for push notifications and get Expo push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    // Check if we're on a physical device
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = tokenData.data;
      console.log('Expo Push Token:', this.expoPushToken);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#5a6bff',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register device token with backend
   */
  async registerDeviceWithBackend(token: string): Promise<boolean> {
    try {
      const deviceId = Constants.deviceId || `device_${Date.now()}`;

      const { data, error } = await api.post('/devices/register/', {
        token,
        platform: Platform.OS,
        device_id: deviceId,
      });

      if (error) {
        console.error('Error registering device:', error);
        return false;
      }

      console.log('Device registered successfully');
      return true;
    } catch (error) {
      console.error('Error registering device:', error);
      return false;
    }
  }

  /**
   * Unregister device from backend (e.g., on logout)
   */
  async unregisterDevice(): Promise<boolean> {
    try {
      const deviceId = Constants.deviceId || '';

      const { error } = await api.post('/devices/unregister/', {
        device_id: deviceId,
      });

      if (error) {
        console.error('Error unregistering device:', error);
        return false;
      }

      console.log('Device unregistered successfully');
      return true;
    } catch (error) {
      console.error('Error unregistering device:', error);
      return false;
    }
  }

  /**
   * Setup push notifications - call this on app startup after login
   */
  async setup(): Promise<void> {
    const token = await this.registerForPushNotifications();

    if (token) {
      // Only register with backend if user is authenticated
      const authToken = await getToken();
      if (authToken) {
        await this.registerDeviceWithBackend(token);
      }
    }
  }

  /**
   * Add listener for received notifications (foreground)
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add listener for notification responses (user tapped notification)
   */
  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Get the last notification response (useful for cold start)
   */
  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return await Notifications.getLastNotificationResponseAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Get current badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Get the current push token
   */
  getToken(): string | null {
    return this.expoPushToken;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
