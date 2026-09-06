import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme/colors';
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

/**
 * A post as a white card on the surface ground, same 20 radius the rest of the
 * app uses. Reactions and comments sit on a hairline foot so the card reads as
 * content first, actions second.
 */
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
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.author, pressed && !!onAuthorPress && styles.pressed]}
          onPress={onAuthorPress}
          disabled={!onAuthorPress}
          accessibilityRole={onAuthorPress ? 'button' : undefined}
          accessibilityLabel={onAuthorPress ? `Ver el perfil de ${post.author.name}` : undefined}
        >
          {post.author.photo_url ? (
            <SkeletonImage
              source={{ uri: post.author.photo_url }}
              style={styles.avatar}
              borderRadius={22}
            />
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

        {onOptionsPress && (
          <Pressable
            style={({ pressed }) => [styles.options, pressed && styles.pressed]}
            onPress={onOptionsPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Opciones de la publicación"
          >
            <Feather name="more-horizontal" size={20} color={colors.gray400} />
          </Pressable>
        )}
      </View>

      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

      {post.image_url && (
        <Pressable
          style={styles.imageWrap}
          onPress={() => setShowFullScreenImage(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel="Ver la foto en pantalla completa"
        >
          <SkeletonImage
            source={{ uri: post.image_url }}
            style={styles.image}
            resizeMode="cover"
            borderRadius={16}
          />
        </Pressable>
      )}

      {post.training && <TrainingBadge training={post.training} variant="compact" />}

      {post.reactions_count > 0 && (
        <View style={styles.summary}>
          {Object.entries(post.reactions_summary)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => (
              <View key={type} style={styles.summaryItem}>
                <Feather
                  name={REACTION_ICONS[type as ReactionType].icon as any}
                  size={13}
                  color={colors.gray400}
                />
                <Text style={styles.summaryCount}>{count}</Text>
              </View>
            ))}
        </View>
      )}

      <View style={styles.actions}>
        <ReactionBar
          userReaction={post.user_reaction}
          onReactionPress={handleReactionPress}
          showPicker={showReactionPicker}
          onClosePicker={() => setShowReactionPicker(false)}
          onMainPress={handleMainReactionPress}
          onMainLongPress={handleMainReactionLongPress}
        />

        <Pressable
          style={({ pressed }) => [styles.comment, pressed && styles.pressed]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={
            post.comments_count > 0
              ? `Ver ${post.comments_count} comentarios`
              : 'Comentar'
          }
        >
          <Feather name="message-circle" size={15} color={colors.gray400} />
          <Text style={styles.commentCount}>
            {post.comments_count > 0 ? post.comments_count : 'Comentar'}
          </Text>
        </Pressable>
      </View>

      {post.image_url && (
        <FullScreenImage
          visible={showFullScreenImage}
          imageUri={post.image_url}
          onClose={() => setShowFullScreenImage(false)}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.92,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  author: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  authorText: {
    flex: 1,
    gap: 1,
  },
  authorName: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  timeAgo: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: colors.gray400,
  },
  options: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  imageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 170,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  summaryCount: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    // The design's own divider is a translucent 10%-black hairline rather
    // than a token color, so it's expressed directly instead of forcing it
    // through a named theme color.
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  comment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  commentCount: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray400,
  },
});
