import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { Post, ReactionType } from '../types/community';
import { communityApi } from '../api/community';
import { PostCard } from '../components/community';

export default function CommunityScreen() {
  const navigation = useNavigation<any>();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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
    } else if (error) {
      console.error('Error fetching feed:', error);
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
    navigation.navigate('CreatePost');
  };

  const handleOptionsPress = (post: Post) => {
    // TODO: Show options menu (delete if own post, report, etc.)
    Alert.alert('Opciones', 'Próximamente');
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onPress={() => handlePostPress(item)}
      onReaction={(type) => handleReaction(item.id, type)}
      onOptionsPress={() => handleOptionsPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={56} color={colors.gray400} />
      </View>
      <Text style={styles.emptyTitle}>Sin publicaciones</Text>
      <Text style={styles.emptySubtitle}>
        Sé el primero en compartir algo con la comunidad Neural
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreatePost}>
        <Text style={styles.emptyButtonText}>Crear publicación</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Comunidad</Text>
        </View>

        {/* Feed */}
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
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />

        {/* FAB - Create Post */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreatePost}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
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
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  listContent: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 140,
  },
  listContentEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
    letterSpacing: -0.1,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    minWidth: 180,
    alignItems: 'center',
  },
  emptyButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    letterSpacing: -0.1,
  },
  footerLoader: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
