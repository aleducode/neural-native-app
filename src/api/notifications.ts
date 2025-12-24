import api from './client';

export interface Notification {
  id: number;
  title: string;
  body: string;
  notification_type: string;
  status: string;
  data: Record<string, any> | null;
  created: string;
  read_at: string | null;
  time_ago: string;
  is_read: boolean;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
}

export interface NotificationCountResponse {
  total: number;
  unread: number;
}

export const notificationsApi = {
  /**
   * Get all notifications for current user
   */
  async getNotifications(): Promise<{ data?: NotificationListResponse; error?: string }> {
    return api.get<NotificationListResponse>('/notifications/');
  },

  /**
   * Get notification counts
   */
  async getCount(): Promise<{ data?: NotificationCountResponse; error?: string }> {
    return api.get<NotificationCountResponse>('/notifications/count/');
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: number): Promise<{ data?: { message: string }; error?: string }> {
    return api.post(`/notifications/${notificationId}/read/`, {});
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ data?: { message: string }; error?: string }> {
    return api.post('/notifications/read-all/', {});
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number): Promise<{ data?: void; error?: string }> {
    return api.delete(`/notifications/${notificationId}/`);
  },
};

export default notificationsApi;
