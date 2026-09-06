import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import { colors, typography } from '../theme/colors';
import { notificationsApi, Notification } from '../api/notifications';

/** Ionicons are gone from the migrated screens; these are the Feather equivalents. */
function getNotificationIcon(type: string): keyof typeof Feather.glyphMap {
  switch (type) {
    case 'training_reminder':
    case 'training_cancelled':
      return 'activity';
    case 'membership_expiring':
    case 'membership_expired':
      return 'credit-card';
    case 'achievement':
      return 'award';
    case 'promotion':
      return 'tag';
    case 'community':
      return 'users';
    default:
      return 'bell';
  }
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Delete: the row asks before it removes, and says so where it happened.
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, []);

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));

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
    setConfirmingId(null);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await notificationsApi.markAllAsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, status: 'read' }))
    );
    setUnreadCount(0);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (confirmingId !== null) {
      // A row is waiting on an answer; the tap dismisses it instead.
      setConfirmingId(null);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
      navigation.navigate('MainTabs', { screen: 'Trainings' });
    } else if (notification.data?.type === 'membership_expiring') {
      // Navigate to membership
      navigation.navigate('Membership');
    } else if (
      notification.data?.type === 'community_comment' ||
      notification.data?.type === 'community_reaction' ||
      notification.data?.type === 'community_new_post'
    ) {
      // Navigate to post detail
      if (notification.data?.post_id) {
        navigation.navigate('PostDetail', { postId: notification.data.post_id });
      }
    }
  };

  const handleAskDelete = (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteError(null);
    setConfirmingId(notification.id);
  };

  const handleConfirmDelete = async (notification: Notification) => {
    setDeletingId(notification.id);
    const { error } = await notificationsApi.deleteNotification(notification.id);
    setDeletingId(null);
    setConfirmingId(null);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setDeleteError(error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    if (!notification.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const confirming = confirmingId === item.id;
    const deleting = deletingId === item.id;

    if (confirming) {
      return (
        <View style={[styles.row, styles.confirmRow]}>
          <Text style={styles.confirmText} numberOfLines={2}>
            ¿Eliminar «{item.title}»?
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              onPress={() => setConfirmingId(null)}
              disabled={deleting}
              style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
            >
              <Text style={styles.confirmCancel}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => handleConfirmDelete(item)}
              disabled={deleting}
              style={({ pressed }) => [
                styles.confirmButton,
                styles.confirmDanger,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Eliminar notificación"
              accessibilityState={{ busy: deleting }}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={styles.confirmDelete}>Eliminar</Text>
              )}
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.body}. ${item.time_ago}${
          item.is_read ? '' : ', sin leer'
        }`}
      >
        <View style={[styles.icon, !item.is_read && styles.iconUnread]}>
          <Feather
            name={getNotificationIcon(item.notification_type)}
            size={18}
            color={item.is_read ? colors.gray400 : colors.accentDeep}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.contentHead}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.time}>{item.time_ago}</Text>
        </View>

        <Pressable
          onPress={() => handleAskDelete(item)}
          hitSlop={10}
          style={({ pressed }) => [styles.trash, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${item.title}`}
        >
          <Feather name="trash-2" size={18} color={colors.gray400} />
        </Pressable>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name="bell-off" size={30} color={colors.gray400} />
      </View>
      <Text style={styles.emptyTitle}>Sin notificaciones</Text>
      <Text style={styles.emptySubtitle}>
        Aquí aparecerán tus notificaciones de entrenamientos, logros y más.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <Screen tone="surface" wash>
        <AppHeader title="Notificaciones" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen tone="surface" wash>
      <AppHeader
        title="Notificaciones"
        subtitle={unreadCount > 0 ? `${unreadCount} sin leer` : undefined}
        action={
          unreadCount > 0
            ? {
                icon: 'check-circle',
                label: 'Marcar todas como leídas',
                onPress: handleMarkAllRead,
              }
            : undefined
        }
      />

      <Animated.View style={[styles.list, bodyStyle]}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            deleteError ? (
              <Text style={styles.listError} accessibilityLiveRegion="polite">
                {deleteError}
              </Text>
            ) : null
          }
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.ink}
            />
          }
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  listError: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnread: {
    backgroundColor: colors.accentSoft,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  contentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentDeep,
  },
  body: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray400,
  },
  time: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: colors.gray400,
  },
  trash: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  confirmText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmButton: {
    minWidth: 96,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDanger: {
    backgroundColor: 'rgba(255, 77, 77, 0.10)',
  },
  confirmCancel: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  confirmDelete: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.error,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray400,
    textAlign: 'center',
  },
});
