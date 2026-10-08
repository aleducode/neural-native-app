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
import { LinearGradient } from 'expo-linear-gradient';
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

/**
 * The design's status pill groups notification_type into three buckets by
 * color (entreno, membresía, todo lo demás). Labels follow the same grouping
 * so the pill always names a real category instead of the raw API type.
 */
function getNotificationStatus(type: string): { label: string; color: string } {
  switch (type) {
    case 'training_reminder':
    case 'training_cancelled':
      return { label: 'Entrenos', color: colors.accentDeep };
    case 'membership_expiring':
    case 'membership_expired':
      // #FFB638 is 1.9:1 on white -- fails as text. Kept only as the small
      // dot below; the label itself renders in ink.
      return { label: 'Membresía', color: '#FFB638' };
    case 'achievement':
      return { label: 'Logros', color: colors.gray400 };
    case 'promotion':
      return { label: 'Promociones', color: colors.gray400 };
    case 'community':
      return { label: 'Comunidad', color: colors.gray400 };
    default:
      return { label: 'Notificación', color: colors.gray400 };
  }
}

/** The design's "Start" time is the clock time the notification fired at. */
function formatNotificationTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
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
        <View style={[styles.card, styles.confirmCard]}>
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

    const status = getNotificationStatus(item.notification_type);

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.body}. ${item.time_ago}${
          item.is_read ? '' : ', sin leer'
        }`}
      >
        <View style={styles.timeCol}>
          <View style={styles.times}>
            <Text style={styles.timeStart}>{formatNotificationTime(item.created)}</Text>
            <Text style={styles.timeEnd}>{item.time_ago}</Text>
          </View>
          {/* Timeline dot is the unread signal: accentDeep while unread, neutral once read. */}
          <View style={styles.timeline}>
            <View style={[styles.dot, !item.is_read && styles.dotUnread]} />
            <View style={styles.timelineLine} />
            <View style={styles.dot} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Pressable
              onPress={() => handleAskDelete(item)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${item.title}`}
            >
              <Feather name="more-vertical" size={16} color={colors.ink} />
            </Pressable>
          </View>

          {/* The design card stops at the title, but a notification whose
              message cannot be read is just a label — and it left the card
              with a visible gap where the text should have been. */}
          {!!item.body && (
            <Text style={styles.body} numberOfLines={3}>
              {item.body}
            </Text>
          )}

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={styles.statusLabel}>{status.label}</Text>
            <View style={styles.hatchTrack}>
              <LinearGradient
                colors={[colors.accent, colors.accentDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.hatchFill}
              />
            </View>
          </View>
        </View>
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
            deleteError || notifications.length > 0 ? (
              <View style={styles.listHeader}>
                {!!deleteError && (
                  <Text style={styles.listError} accessibilityLiveRegion="polite">
                    {deleteError}
                  </Text>
                )}
                {/* Column labels from the design; no "+" here -- the app doesn't create
                    notifications, so "mark all as read" stays in AppHeader's action slot. */}
                {notifications.length > 0 && (
                  <View style={styles.listLabels}>
                    <Text style={styles.listLabel}>Hora</Text>
                    <Text style={styles.listLabel}>Notificación</Text>
                  </View>
                )}
              </View>
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
  listHeader: {
    gap: 12,
  },
  listLabels: {
    flexDirection: 'row',
    gap: 16,
  },
  listLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  timeCol: {
    width: 46,
    alignItems: 'center',
    gap: 8,
  },
  times: {
    alignItems: 'center',
    gap: 4,
  },
  timeStart: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  timeEnd: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.gray400,
  },
  // 6x92: two 6px dots plus a 72px connector, matching the design's timeline.
  timeline: {
    width: 6,
    height: 92,
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    // Decorative connector, not text -- #DEDEDE isn't in the theme scale.
    backgroundColor: '#DEDEDE',
  },
  dotUnread: {
    backgroundColor: colors.accentDeep,
  },
  timelineLine: {
    width: 2,
    height: 72,
    backgroundColor: '#DEDEDE',
  },
  card: {
    flex: 1,
    // Without this the card stretches to match the timeline beside it, which
    // is taller than the card's own content.
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 16,
  },
  body: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray400,
    marginTop: -6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.regular,
    color: colors.ink,
  },
  // Decorative divider from the design; not backed by any API field, so the
  // filled portion is a fixed accent rather than a real progress value.
  hatchTrack: {
    flex: 1,
    height: 6,
    borderRadius: 32,
    backgroundColor: '#DEDEDE',
    overflow: 'hidden',
  },
  hatchFill: {
    width: '40%',
    height: 6,
    borderRadius: 32,
  },
  confirmCard: {
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
