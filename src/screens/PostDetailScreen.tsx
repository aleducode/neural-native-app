import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { Post, Comment, ReactionType, REACTION_ICONS } from '../types/community';
import { communityApi } from '../api/community';
import { CommentItem, CommentInput, ReactionBar, TrainingBadge } from '../components/community';
import FullScreenImage from '../components/community/FullScreenImage';
import { RootStackParamList } from '../navigation/RootNavigator';

type PostDetailRouteProp = RouteProp<RootStackParamList, 'PostDetail'>;

export default function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);

  const fetchPostAndComments = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingComments(true);

    // Fetch post details (we'll simulate with the feed for now)
    const feedResponse = await communityApi.getFeed(1);
    if (feedResponse.data) {
      const foundPost = feedResponse.data.posts.find((p) => p.id === postId);
      if (foundPost) {
        setPost(foundPost);
      }
    }
    setIsLoading(false);

    // Fetch comments
    const commentsResponse = await communityApi.getComments(postId);
    if (commentsResponse.data) {
      setComments(commentsResponse.data.comments);
    }
    setIsLoadingComments(false);
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      fetchPostAndComments();
    }, [fetchPostAndComments])
  );

  const handleBack = () => {
    navigation.goBack();
  };

  const handleReactionPress = async (reactionType: ReactionType) => {
    if (!post) return;

    // If clicking the same reaction, remove it
    const isRemovingReaction = post.user_reaction === reactionType;
    const newReaction = isRemovingReaction ? null : reactionType;

    // Optimistic update
    const oldReaction = post.user_reaction;
    const newSummary = { ...post.reactions_summary };
    let newCount = post.reactions_count;

    if (oldReaction) {
      newSummary[oldReaction] = Math.max(0, newSummary[oldReaction] - 1);
      newCount--;
    }

    if (newReaction) {
      newSummary[newReaction] = (newSummary[newReaction] || 0) + 1;
      newCount++;
    }

    setPost({
      ...post,
      user_reaction: newReaction,
      reactions_summary: newSummary,
      reactions_count: newCount,
    });

    // API call
    if (newReaction) {
      await communityApi.addReaction(postId, newReaction);
    } else {
      await communityApi.removeReaction(postId);
    }
  };

  const handleMainPress = () => {
    // Toggle fire reaction on single tap
    handleReactionPress('fire');
  };

  const handleMainLongPress = () => {
    setShowReactionPicker(true);
  };

  const handleAddComment = async (content: string) => {
    const { data, error } = await communityApi.addComment(postId, content);

    if (data) {
      setComments((prev) => [...prev, data]);
      if (post) {
        setPost({ ...post, comments_count: post.comments_count + 1 });
      }
    } else if (error) {
      Alert.alert('Error', 'No se pudo agregar el comentario.');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    Alert.alert('Eliminar comentario', '¿Estás seguro de que quieres eliminar este comentario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await communityApi.deleteComment(commentId);
          if (!error) {
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            if (post) {
              setPost({ ...post, comments_count: Math.max(0, post.comments_count - 1) });
            }
          }
        },
      },
    ]);
  };

  const renderPostHeader = () => {
    if (!post) return null;

    return (
      <View style={styles.postContainer}>
        {/* Author Header */}
        <View style={styles.authorRow}>
          {post.author.photo_url ? (
            <Image source={{ uri: post.author.photo_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{post.author.initials}</Text>
            </View>
          )}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.author.name}</Text>
            <Text style={styles.timeAgo}>{post.time_ago}</Text>
          </View>
        </View>

        {/* Content */}
        {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

        {/* Image */}
        {post.image_url && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowFullScreenImage(true)}
          >
            <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
          </TouchableOpacity>
        )}

        {/* Training Badge */}
        {post.training && <TrainingBadge training={post.training} />}

        {/* Reactions Summary */}
        {post.reactions_count > 0 && (
          <View style={styles.reactionsSummary}>
            {Object.entries(post.reactions_summary)
              .filter(([_, count]) => count > 0)
              .map(([type, count]) => (
                <View key={type} style={styles.reactionSummaryItem}>
                  <Ionicons 
                    name={REACTION_ICONS[type as ReactionType].outline as any} 
                    size={16} 
                    color={colors.gray400} 
                  />
                  <Text style={styles.reactionCount}>{count}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Reaction Bar */}
        <View style={styles.reactionBarContainer}>
          <ReactionBar
            userReaction={post.user_reaction}
            onReactionPress={handleReactionPress}
            showPicker={showReactionPicker}
            onClosePicker={() => setShowReactionPicker(false)}
            onMainPress={handleMainPress}
            onMainLongPress={handleMainLongPress}
          />
        </View>

        {/* Comments Header */}
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>
            Comentarios ({post.comments_count})
          </Text>
        </View>
      </View>
    );
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItemContainer}>
      <CommentItem
        comment={item}
        onDelete={item.is_mine ? () => handleDeleteComment(item.id) : undefined}
      />
    </View>
  );

  const renderEmptyComments = () => (
    <View style={styles.emptyComments}>
      <Ionicons name="chatbubble-outline" size={48} color={colors.gray400} />
      <Text style={styles.emptyCommentsText}>Sin comentarios aún</Text>
      <Text style={styles.emptyCommentsSubtext}>Sé el primero en comentar</Text>
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

  if (!post) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Publicación</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No se encontró la publicación</Text>
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
          colors={['rgba(69, 255, 183, 0.15)', 'transparent']}
          style={styles.gradientTop}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publicación</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Comments List with Post as Header */}
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderComment}
          ListHeaderComponent={renderPostHeader}
          ListEmptyComponent={isLoadingComments ? null : renderEmptyComments}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Comment Input */}
        <SafeAreaView edges={['bottom']} style={styles.commentInputSafeArea}>
          <CommentInput onSubmit={handleAddComment} />
        </SafeAreaView>
      </SafeAreaView>

      {/* Full Screen Image Modal */}
      {post.image_url && (
        <FullScreenImage
          visible={showFullScreenImage}
          imageUri={post.image_url}
          onClose={() => setShowFullScreenImage(false)}
        />
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
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
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray600,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  postContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
  },
  authorInfo: {
    marginLeft: spacing.md,
  },
  authorName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  timeAgo: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    marginTop: 2,
  },
  content: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.white,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  reactionsSummary: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  reactionSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reactionCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
  },
  reactionBarContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray600,
    paddingTop: spacing.md,
  },
  commentsHeader: {
    marginTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray600,
  },
  commentsTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  commentItemContainer: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.cardDark,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyCommentsText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    marginTop: spacing.md,
  },
  emptyCommentsSubtext: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    marginTop: spacing.xs,
  },
  commentInputSafeArea: {
    backgroundColor: colors.cardDark,
  },
});
