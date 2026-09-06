import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
  Linking,
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
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { colors, typography } from '../theme/colors';
import { communityApi, UserPublicProfile } from '../api/community';
import { PostCard } from '../components/community';
import { ReactionType } from '../types/community';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import { RootStackParamList } from '../navigation/RootNavigator';

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<UserProfileRouteProp>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const intro = useSharedValue(0);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 14 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withDelay(90, withTiming(intro.value, { duration: 400 })),
    transform: [{ translateY: withDelay(90, withTiming((1 - intro.value) * 14, { duration: 400 })) }],
  }));

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    const { data } = await communityApi.getUserProfile(userId);
    if (data) {
      setProfile(data);
    }
    setIsLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const handleInstagramPress = () => {
    if (profile?.instagram) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const username = profile.instagram.replace('@', '');
      Linking.openURL(`https://instagram.com/${username}`);
    }
  };

  const handlePostPress = (postId: number) => {
    navigation.navigate('PostDetail', { postId });
  };

  const handleReaction = async (postId: number, reactionType: ReactionType | null) => {
    if (!profile) return;

    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        recent_posts: prev.recent_posts.map((post) => {
          if (post.id !== postId) return post;

          const oldReaction = post.user_reaction;
          const newSummary = { ...post.reactions_summary };
          let newCount = post.reactions_count;

          if (oldReaction) {
            newSummary[oldReaction] = Math.max(0, newSummary[oldReaction] - 1);
            newCount--;
          }

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
        }),
      };
    });

    if (reactionType) {
      await communityApi.addReaction(postId, reactionType);
    } else {
      await communityApi.removeReaction(postId);
    }
  };

  if (isLoading) {
    return (
      <Screen wash>
        <AppHeader title="Perfil" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen wash>
        <AppHeader title="Perfil" />
        <View style={styles.centered}>
          <Feather name="alert-circle" size={24} color={colors.gray400} />
          <Text style={styles.errorTitle}>No se encontró el perfil</Text>
        </View>
      </Screen>
    );
  }

  const stats = [
    { value: profile.stats.total_trainings, label: 'Entrenos' },
    { value: profile.stats.current_strike, label: 'Semanas' },
    { value: profile.stats.posts_count, label: 'Publicaciones' },
  ];

  return (
    <Screen wash>
      <AppHeader title="Perfil" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.identity, headerStyle]}>
          {profile.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>
                {profile.first_name?.[0] || ''}
                {profile.last_name?.[0] || ''}
              </Text>
            </View>
          )}

          <Text style={styles.name}>{profile.name}</Text>

          {!!profile.profession && <Text style={styles.meta}>{profile.profession}</Text>}
          {!!profile.member_since && (
            <Text style={styles.meta}>Miembro desde {profile.member_since}</Text>
          )}

          {!!profile.instagram && (
            <Pressable
              style={({ pressed }) => [styles.instagram, pressed && styles.pressed]}
              onPress={handleInstagramPress}
              accessibilityRole="link"
              accessibilityLabel={`Abrir ${profile.instagram} en Instagram`}
            >
              <Feather name="instagram" size={16} color={colors.ink} />
              <Text style={styles.instagramText}>{profile.instagram}</Text>
            </Pressable>
          )}
        </Animated.View>

        <Animated.View style={bodyStyle}>
          <View style={styles.statsCard}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.stat}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {profile.recent_posts.length > 0 ? (
            <View style={styles.posts}>
              <Text style={styles.sectionTitle}>Publicaciones recientes</Text>
              {profile.recent_posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPress={() => handlePostPress(post.id)}
                  onReaction={(type) => handleReaction(post.id, type)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyPosts}>
              <Feather name="file-text" size={22} color={colors.gray400} />
              <Text style={styles.emptyPostsTitle}>Sin publicaciones</Text>
              <Text style={styles.emptyPostsText}>
                Todavía no compartió nada con la comunidad.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  identity: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
    gap: 4,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
  },
  avatarFallback: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily,
    fontSize: 30,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: 30,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -1,
    color: colors.ink,
    textAlign: 'center',
  },
  meta: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
  },
  instagram: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  instagramText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  statValue: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  posts: {
    gap: 0,
  },
  sectionTitle: {
    marginBottom: 12,
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  emptyPosts: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 32,
  },
  emptyPostsTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
  },
  emptyPostsText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.gray400,
  },
});
