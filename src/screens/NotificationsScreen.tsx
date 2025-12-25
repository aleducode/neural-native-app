import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { notificationsApi, Notification } from '../api/notifications';

export default function NotificationsScreen() {
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const fetchNotifications = async () => {
    const { data } = await notificationsApi.getNotifications();
    if (data) {
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllAsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, status: 'read' }))
    );
    setUnreadCount(0);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      await notificationsApi.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true, status: 'read' } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Handle navigation based on notification type
    if (notification.data?.type === 'training_reminder') {
      // Navigate to trainings
    } else if (notification.data?.type === 'membership_expiring') {
      // Navigate to membership
    } else if (
      notification.data?.type === 'community_comment' ||
      notification.data?.type === 'community_reaction' ||
      notification.data?.type === 'community_new_post'
    ) {
      // Navigate to post detail
      if (notification.data?.post_id) {
        navigation.navigate('PostDetail' as never, { postId: notification.data.post_id } as never);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'training_reminder':
      case 'training_cancelled':
        return 'fitness-outline';
      case 'membership_expiring':
      case 'membership_expired':
        return 'card-outline';
      case 'achievement':
        return 'trophy-outline';
      case 'promotion':
        return 'pricetag-outline';
      case 'community':
        return 'people-outline';
      default:
        return 'notifications-outline';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.is_read && styles.notificationCardUnread]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIcon}>
        <Ionicons
          name={getNotificationIcon(item.notification_type)}
          size={24}
          color={colors.textDark}
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>{item.time_ago}</Text>
        </View>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-off-outline" size={64} color={colors.gray400} />
      </View>
      <Text style={styles.emptyTitle}>Sin notificaciones</Text>
      <Text style={styles.emptySubtitle}>
        Aquí aparecerán tus notificaciones de entrenamientos, logros y más.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['rgba(90, 107, 255, 0.15)', 'transparent']}
          style={styles.gradientTop}
        />
        <LinearGradient
          colors={['rgba(90, 107, 255, 0.15)', 'transparent']}
          style={styles.gradientBottom}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllRead}
            >
              <Ionicons name="checkmark-done" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* Notifications List */}
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    position: 'absolute',
    top: 50,
    left: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 80,
    right: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  markAllButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listContentEmpty: {
    flex: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  notificationCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginRight: spacing.sm,
  },
  notificationTime: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
  },
  notificationBody: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.title2,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 22,
  },
});
