import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { communityApi, UserPublicProfile } from '../api/community';
import { PostCard } from '../components/community';
import { ReactionType } from '../types/community';
import { RootStackParamList } from '../navigation/RootNavigator';

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<UserProfileRouteProp>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleBack = () => {
    navigation.goBack();
  };

  const handleInstagramPress = () => {
    if (profile?.instagram) {
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
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Perfil</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No se encontró el perfil</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['rgba(90, 107, 255, 0.15)', 'transparent']}
          style={styles.gradientTop}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {profile.photo_url ? (
              <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile.first_name?.[0] || ''}{profile.last_name?.[0] || ''}
                </Text>
              </View>
            )}

            <Text style={styles.profileName}>{profile.name}</Text>

            {profile.profession && (
              <Text style={styles.profession}>{profile.profession}</Text>
            )}

            {profile.member_since && (
              <Text style={styles.memberSince}>Miembro desde {profile.member_since}</Text>
            )}

            {profile.instagram && (
              <TouchableOpacity style={styles.instagramButton} onPress={handleInstagramPress}>
                <Feather name="instagram" size={18} color={colors.primary} />
                <Text style={styles.instagramText}>{profile.instagram}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.stats.total_trainings}</Text>
              <Text style={styles.statLabel}>Entrenamientos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.stats.current_strike}</Text>
              <Text style={styles.statLabel}>Semanas racha</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.stats.posts_count}</Text>
              <Text style={styles.statLabel}>Publicaciones</Text>
            </View>
          </View>

          {/* Recent Posts */}
          {profile.recent_posts.length > 0 && (
            <View style={styles.postsSection}>
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
          )}

          {profile.recent_posts.length === 0 && (
            <View style={styles.emptyPosts}>
              <Feather name="file-text" size={48} color={colors.gray400} />
              <Text style={styles.emptyPostsText}>Sin publicaciones</Text>
            </View>
          )}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
  },
  profileName: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginTop: spacing.lg,
  },
  profession: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    marginTop: spacing.xs,
  },
  memberSince: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    marginTop: spacing.sm,
  },
  instagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(90, 107, 255, 0.1)',
    borderRadius: borderRadius.full,
  },
  instagramText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray600,
  },
  postsSection: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyPostsText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    marginTop: spacing.md,
  },
});
