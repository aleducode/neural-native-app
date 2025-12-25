import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme/colors';
import { Post, ReactionType, REACTION_EMOJIS } from '../../types/community';
import ReactionBar from './ReactionBar';
import TrainingBadge from './TrainingBadge';

interface PostCardProps {
  post: Post;
  onPress: () => void;
  onReaction: (reactionType: ReactionType | null) => void;
  onOptionsPress?: () => void;
}

export default function PostCard({
  post,
  onPress,
  onReaction,
  onOptionsPress,
}: PostCardProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const handleReactionPress = (type: ReactionType) => {
    if (post.user_reaction === type) {
      // Remove reaction if same type
      onReaction(null);
    } else {
      // Add or change reaction
      onReaction(type);
    }
    setShowReactionPicker(false);
  };

  const handleMainReactionPress = () => {
    if (post.user_reaction) {
      // Remove current reaction
      onReaction(null);
    } else {
      // Show picker or add default reaction
      setShowReactionPicker(true);
    }
  };

  const handleMainReactionLongPress = () => {
    setShowReactionPicker(true);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          {post.author.photo_url ? (
            <Image
              source={{ uri: post.author.photo_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{post.author.initials}</Text>
            </View>
          )}
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{post.author.name}</Text>
            <Text style={styles.timeAgo}>{post.time_ago}</Text>
          </View>
        </View>
        {onOptionsPress && (
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={onOptionsPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={styles.content}>{post.content}</Text>
      ) : null}

      {/* Image */}
      {post.image_url && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.image_url }}
            style={styles.postImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Training Badge */}
      {post.training && (
        <TrainingBadge training={post.training} />
      )}

      {/* Reactions Summary */}
      {post.reactions_count > 0 && (
        <View style={styles.reactionsSummary}>
          {Object.entries(post.reactions_summary)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => (
              <View key={type} style={styles.reactionSummaryItem}>
                <Text style={styles.reactionEmoji}>
                  {REACTION_EMOJIS[type as ReactionType]}
                </Text>
                <Text style={styles.reactionCount}>{count}</Text>
              </View>
            ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <ReactionBar
          userReaction={post.user_reaction}
          onReactionPress={handleReactionPress}
          showPicker={showReactionPicker}
          onClosePicker={() => setShowReactionPicker(false)}
          onMainPress={handleMainReactionPress}
          onMainLongPress={handleMainReactionLongPress}
        />

        <TouchableOpacity style={styles.commentButton} onPress={onPress}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.gray400} />
          <Text style={styles.commentCount}>{post.comments_count}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  authorDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  authorName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textDark,
  },
  timeAgo: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    marginTop: 2,
  },
  optionsButton: {
    padding: spacing.xs,
  },
  content: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.textDark,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  imageContainer: {
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.md,
  },
  postImage: {
    width: '100%',
    height: 250,
  },
  reactionsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  reactionSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  commentCount: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
});
