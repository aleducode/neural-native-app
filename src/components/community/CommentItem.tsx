import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme/colors';
import { Comment } from '../../types/community';

interface CommentItemProps {
  comment: Comment;
  onDelete?: () => void;
}

export default function CommentItem({ comment, onDelete }: CommentItemProps) {
  return (
    <View style={styles.container}>
      {comment.author.photo_url ? (
        <Image source={{ uri: comment.author.photo_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>{comment.author.initials}</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.head}>
          <Text style={styles.authorName} numberOfLines={1}>
            {comment.author.name}
          </Text>
          <Text style={styles.timeAgo}>{comment.time_ago}</Text>
        </View>
        <Text style={styles.text}>{comment.content}</Text>
      </View>

      {comment.is_mine && onDelete && (
        <Pressable
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
          onPress={onDelete}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Eliminar comentario"
        >
          <Feather name="trash-2" size={16} color={colors.error} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  content: {
    flex: 1,
    gap: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  timeAgo: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  delete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
