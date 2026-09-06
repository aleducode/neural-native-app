import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/colors';
import { Post, ReactionType } from '../types/community';
import { communityApi } from '../api/community';
import { PostCard } from '../components/community';
import Screen from '../components/ui/Screen';
import PrimaryButton from '../components/ui/PrimaryButton';
import { captureException } from '../utils/sentry';

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // Feed and delete failures are shown in the screen, not in an alert the user
  // has to dismiss before they can see the feed again.
  const [feedError, setFeedError] = useState<string | null>(null);

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));
  const listStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
  }));

  const fetchPosts = useCallback(async (page: number = 1, refresh: boolean = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const { data, error } = await communityApi.getFeed(page);

    if (data) {
      if (page === 1) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }
      setCurrentPage(page);
      setHasMore(data.has_more);
      setFeedError(null);
    } else if (error) {
      console.error('Error fetching feed:', error);
      setFeedError('No pudimos cargar la comunidad. Desliza para reintentar.');
    }

    setIsLoading(false);
    setIsRefreshing(false);
    setIsLoadingMore(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPosts(1);
    }, [fetchPosts])
  );

  const handleRefresh = () => {
    fetchPosts(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchPosts(currentPage + 1);
    }
  };

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  };

  const handleReaction = async (postId: number, reactionType: ReactionType | null) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        const oldReaction = post.user_reaction;
        const newSummary = { ...post.reactions_summary };
        let newCount = post.reactions_count;

        // Remove old reaction from summary
        if (oldReaction) {
          newSummary[oldReaction] = Math.max(0, newSummary[oldReaction] - 1);
          newCount--;
        }

        // Add new reaction to summary
        if (reactionType) {
          newSummary[reactionType] = (newSummary[reactionType] || 0) + 1;
          newCount++;
        }

        return {
          ...post,
          user_reaction: reactionType,
          reactions_summary: newSummary,
          reactions_count: newCount,
        };
      })
    );

    // API call
    if (reactionType) {
      await communityApi.addReaction(postId, reactionType);
    } else {
      await communityApi.removeReaction(postId);
    }
  };

  const handleCreatePost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CreatePost');
  };

  const deletePost = async (postId: number) => {
    const { error } = await communityApi.deletePost(postId);

    if (error) {
      captureException(new Error(error), { context: 'communityDeletePost', postId });
      setFeedError('No pudimos eliminar la publicación. Intenta de nuevo.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setFeedError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Only reachable on your own posts, and deleting one cannot be undone, so
  // this alert stays.
  const handleOptionsPress = (post: Post) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Eliminar publicación',
      '¿Seguro que quieres eliminarla? No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' as const },
        {
          text: 'Eliminar',
          style: 'destructive' as const,
          onPress: () => deletePost(post.id),
        },
      ]
    );
  };

  const handleAuthorPress = (authorId: number) => {
    navigation.navigate('UserProfile', { userId: authorId });
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isMine = !!user && item.author.id === user.id;

    return (
      <PostCard
        post={item}
        onPress={() => handlePostPress(item)}
        onReaction={(type) => handleReaction(item.id, type)}
        onOptionsPress={isMine ? () => handleOptionsPress(item) : undefined}
        onAuthorPress={() => handleAuthorPress(item.author.id)}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name="users" size={28} color={colors.ink} />
      </View>
      <Text style={styles.emptyTitle}>Todavía no hay nada por acá</Text>
      <Text style={styles.emptyText}>
        Sé el primero en compartir algo con la comunidad Neural.
      </Text>
      <PrimaryButton
        label="Crear publicación"
        onPress={handleCreatePost}
        icon="arrow-right"
        style={styles.emptyCta}
      />
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.ink} />
      </View>
    );
  };

  if (isLoading) {
    return (
      <Screen wash>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen wash>
      <Animated.View style={[styles.header, headerStyle]}>
        <Text style={styles.title}>Comunidad</Text>
        <Text style={styles.subtitle}>Lo que está entrenando la gente de Neural.</Text>
        {!!feedError && <Text style={styles.error}>{feedError}</Text>}
      </Animated.View>

      <Animated.View style={[styles.flex, listStyle]}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPost}
          contentContainerStyle={[
            styles.listContent,
            posts.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.ink}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      </Animated.View>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleCreatePost}
        accessibilityRole="button"
        accessibilityLabel="Crear publicación"
      >
        <Feather name="plus" size={18} color={colors.white} />
        <Text style={styles.fabLabel}>Publicar</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 6,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 34,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -1,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    color: colors.gray400,
  },
  error: {
    marginTop: 4,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.error,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 160,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray400,
  },
  emptyCta: {
    alignSelf: 'stretch',
    marginTop: 10,
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    // Clears the tab bar.
    bottom: 100,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: colors.ink,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  fabLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
});
