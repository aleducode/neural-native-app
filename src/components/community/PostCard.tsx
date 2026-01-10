import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme/colors';
import { Post, ReactionType, REACTION_ICONS } from '../../types/community';
import ReactionBar from './ReactionBar';
import TrainingBadge from './TrainingBadge';
import SkeletonImage from './SkeletonImage';
import FullScreenImage from './FullScreenImage';

interface PostCardProps {
  post: Post;
  onPress: () => void;
  onReaction: (reactionType: ReactionType | null) => void;
  onOptionsPress?: () => void;
  onAuthorPress?: () => void;
}

export default function PostCard({
  post,
  onPress,
  onReaction,
  onOptionsPress,
  onAuthorPress,
}: PostCardProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);

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
        <TouchableOpacity
          style={styles.authorInfo}
          onPress={onAuthorPress}
          activeOpacity={onAuthorPress ? 0.7 : 1}
          disabled={!onAuthorPress}
        >
          {post.author.photo_url ? (
            <SkeletonImage
              source={{ uri: post.author.photo_url }}
              style={styles.avatar}
              borderRadius={24}
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
        </TouchableOpacity>
        {onOptionsPress && (
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={onOptionsPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="more-horizontal" size={20} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={styles.content}>{post.content}</Text>
      ) : null}

      {/* Image */}
      {post.image_url && (
        <TouchableOpacity
          style={styles.imageContainer}
          activeOpacity={0.9}
          onPress={() => setShowFullScreenImage(true)}
        >
          <SkeletonImage
            source={{ uri: post.image_url }}
            style={styles.postImage}
            resizeMode="cover"
            borderRadius={borderRadius.md}
          />
        </TouchableOpacity>
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
                <Feather
                  name={REACTION_ICONS[type as ReactionType].icon as any}
                  size={16}
                  color={colors.gray400}
                />
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
          <Feather name="message-circle" size={18} color={colors.gray400} />
          {post.comments_count > 0 && (
            <Text style={styles.commentCount}>{post.comments_count}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Full Screen Image Modal */}
      {post.image_url && (
        <FullScreenImage
          visible={showFullScreenImage}
          imageUri={post.image_url}
          onClose={() => setShowFullScreenImage(false)}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(90, 107, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(90, 107, 255, 0.3)',
  },
  avatarText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
  },
  authorDetails: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  authorName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    letterSpacing: -0.2,
  },
  timeAgo: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray400,
    marginTop: 4,
    letterSpacing: -0.1,
  },
  optionsButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  content: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    marginBottom: spacing.lg,
    letterSpacing: -0.1,
  },
  imageContainer: {
    marginHorizontal: -spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 280,
  },
  reactionsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  reactionSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  commentCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
    letterSpacing: -0.1,
  },
});
