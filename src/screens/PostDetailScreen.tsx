import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/colors';
import { Post, Comment, ReactionType, REACTION_ICONS } from '../types/community';
import { communityApi } from '../api/community';
import { CommentItem, CommentInput, ReactionBar, TrainingBadge } from '../components/community';
import FullScreenImage from '../components/community/FullScreenImage';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import { RootStackParamList } from '../navigation/RootNavigator';
import { captureException } from '../utils/sentry';

type PostDetailRouteProp = RouteProp<RootStackParamList, 'PostDetail'>;

export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params;
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));

  const fetchPostAndComments = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingComments(true);

    // The detail endpoint, not page 1 of the feed: a comment notification lands
    // here on a post that has usually already scrolled off the first page.
    const { data, error } = await communityApi.getPostDetail(postId);
    if (data?.post) {
      setPost(data.post);
    } else if (error) {
      captureException(new Error(error), { context: 'communityPostDetail', postId });
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

  const isMine = !!user && !!post && post.author.id === user.id;

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
      setCommentError(null);
      if (post) {
        setPost({ ...post, comments_count: post.comments_count + 1 });
      }
    } else if (error) {
      setCommentError('No se pudo agregar el comentario. Intenta de nuevo.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    Alert.alert('Eliminar comentario', '¿Estás seguro de que quieres eliminar este comentario?', [
      { text: 'Cancelar', style: 'cancel' as const },
      {
        text: 'Eliminar',
        style: 'destructive' as const,
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

  const deletePost = async () => {
    const { error } = await communityApi.deletePost(postId);

    if (error) {
      captureException(new Error(error), { context: 'communityDeletePost', postId });
      setCommentError('No pudimos eliminar la publicación. Intenta de nuevo.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate('MainTabs');
  };

  // Deleting a post cannot be undone, so the confirmation stays an alert.
  const handleDeletePost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Eliminar publicación',
      '¿Seguro que quieres eliminarla? No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' as const },
        { text: 'Eliminar', style: 'destructive' as const, onPress: deletePost },
      ]
    );
  };

  const renderPostHeader = () => {
    if (!post) return null;

    return (
      <Animated.View style={bodyStyle}>
        <View style={styles.postCard}>
          <Pressable
            style={({ pressed }) => [styles.authorRow, pressed && styles.pressed]}
            onPress={() => navigation.navigate('UserProfile', { userId: post.author.id })}
            accessibilityRole="button"
            accessibilityLabel={`Ver el perfil de ${post.author.name}`}
          >
            {post.author.photo_url ? (
              <Image source={{ uri: post.author.photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{post.author.initials}</Text>
              </View>
            )}
            <View style={styles.authorText}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.author.name}
              </Text>
              <Text style={styles.timeAgo}>{post.time_ago}</Text>
            </View>
          </Pressable>

          {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

          {post.image_url && (
            <Pressable
              style={styles.imageWrap}
              onPress={() => setShowFullScreenImage(true)}
              accessibilityRole="imagebutton"
              accessibilityLabel="Ver la foto en pantalla completa"
            >
              <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />
            </Pressable>
          )}

          {post.training && <TrainingBadge training={post.training} />}

          {post.reactions_count > 0 && (
            <View style={styles.summary}>
              {Object.entries(post.reactions_summary)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => (
                  <View key={type} style={styles.summaryItem}>
                    <Feather
                      name={REACTION_ICONS[type as ReactionType].icon as any}
                      size={14}
                      color={colors.gray400}
                    />
                    <Text style={styles.summaryCount}>{count}</Text>
                  </View>
                ))}
            </View>
          )}

          <View style={styles.reactionRow}>
            <ReactionBar
              userReaction={post.user_reaction}
              onReactionPress={handleReactionPress}
              showPicker={showReactionPicker}
              onClosePicker={() => setShowReactionPicker(false)}
              onMainPress={handleMainPress}
              onMainLongPress={handleMainLongPress}
            />
          </View>
        </View>

        <Text style={styles.commentsTitle}>
          {post.comments_count > 0 ? `Comentarios (${post.comments_count})` : 'Comentarios'}
        </Text>
      </Animated.View>
    );
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <CommentItem
      comment={item}
      onDelete={item.is_mine ? () => handleDeleteComment(item.id) : undefined}
    />
  );

  const renderEmptyComments = () => (
    <View style={styles.emptyComments}>
      <Feather name="message-circle" size={22} color={colors.gray400} />
      <Text style={styles.emptyCommentsTitle}>Sin comentarios aún</Text>
      <Text style={styles.emptyCommentsText}>Sé el primero en comentar.</Text>
    </View>
  );

  if (isLoading) {
    return (
      <Screen wash>
        <AppHeader title="Publicación" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen wash>
        <AppHeader title="Publicación" />
        <View style={styles.centered}>
          <Feather name="alert-circle" size={24} color={colors.gray400} />
          <Text style={styles.errorTitle}>No se encontró la publicación</Text>
          <Text style={styles.errorText}>
            Es posible que su autor la haya eliminado.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen wash>
      <AppHeader
        title="Publicación"
        action={
          isMine
            ? { icon: 'trash-2', label: 'Eliminar publicación', onPress: handleDeletePost }
            : undefined
        }
      />

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderComment}
        ListHeaderComponent={renderPostHeader}
        ListEmptyComponent={isLoadingComments ? null : renderEmptyComments}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <SafeAreaView edges={['bottom']} style={styles.inputBar}>
        <CommentInput
          onSubmit={handleAddComment}
          error={commentError ?? undefined}
          onChangeContent={() => commentError && setCommentError(null)}
        />
      </SafeAreaView>

      {post.image_url && (
        <FullScreenImage
          visible={showFullScreenImage}
          imageUri={post.image_url}
          onClose={() => setShowFullScreenImage(false)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  errorTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.4,
    color: colors.ink,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  postCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  authorText: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  timeAgo: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  content: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  imageWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 260,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryCount: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  reactionRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  commentsTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  emptyComments: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 32,
  },
  emptyCommentsTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  emptyCommentsText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
  },
  inputBar: {
    backgroundColor: colors.white,
  },
});
