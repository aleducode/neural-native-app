import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { dashboardApi } from '../api/dashboard';
import { getLeaderboard, LeaderboardAvatar, ordinal } from '../components/community';
import Screen from '../components/ui/Screen';
import AppHeader from '../components/ui/AppHeader';
import { RootStackParamList } from '../navigation/RootNavigator';

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

/**
 * A member who never filled in a name arrives without one. The server used to
 * send the local part of their email here, which both read badly and handed
 * out half an address; it sends null now, and this is what we show instead.
 *
 * The ranking labels the same person by their initials, and tapping their row
 * is how you get to this screen, so the two have to agree. "Miembro de Neural"
 * only stands in until the endpoint carries `initials` like the table does.
 */
function profileName(profile: UserPublicProfile): string {
  const given = (profile.name || '').trim();
  if (given) return given;
  return profile.initials?.trim() || 'Miembro de Neural';
}

/** Two letters for the avatar, from whichever field still has them. */
function avatarInitials(profile: UserPublicProfile): string {
  const fromName = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.trim();
  return fromName || profile.initials?.trim() || '';
}

export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<UserProfileRouteProp>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // The weekly rank badge and the streak comparison both need data this
  // screen doesn't otherwise fetch. Neither refetches on every focus like the
  // profile does below — the leaderboard is read once per session through
  // the shared cache (components/community/leaderboardStore), and the
  // viewer's own streak is a single small call.
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [myStreak, setMyStreak] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getLeaderboard('trainings').then((board) => {
      if (!alive) return;
      // The endpoint only returns the top 25. If this member isn't in that
      // set we don't know their real rank, so no badge rather than a guess.
      const entry = board.entries.find((m) => m.id === userId);
      setLeaderboardRank(entry ? entry.position : null);
    });
    dashboardApi.getDashboard().then(({ data }) => {
      if (alive && data) setMyStreak(data.strike.weeks);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

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

  const handlePostPress = (postId: number) => {
    navigation.navigate('PostDetail', { postId });
  };

  const personStreak = profile?.stats.current_strike ?? 0;
  const streakRatio = useMemo(() => {
    const max = Math.max(personStreak, myStreak ?? 0, 1);
    return personStreak / max;
  }, [personStreak, myStreak]);

  const photoPosts = useMemo(
    () => (profile ? profile.recent_posts.filter((p) => !!p.image_url).slice(0, 3) : []),
    [profile]
  );

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

  return (
    <Screen wash>
      <AppHeader title="Perfil" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.identity, headerStyle]}>
          <LeaderboardAvatar
            photoUrl={profile.photo_url}
            initials={avatarInitials(profile)}
            size={72}
            borderWidth={2}
            borderColor={colors.accentDeep}
            fontSize={24}
          />

          <View style={styles.identityText}>
            <Text style={styles.name}>{profileName(profile)}</Text>
            {!!profile.member_since && (
              <Text style={styles.meta}>En Neural desde {profile.member_since}</Text>
            )}
            {leaderboardRank != null && (
              <Text style={styles.rankBadge}>{ordinal(leaderboardRank)} esta semana</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View style={bodyStyle}>
          <View style={styles.hero}>
            <View style={styles.heroValueRow}>
              <Text style={styles.heroValue}>{profile.stats.total_trainings}</Text>
              <Text style={styles.heroUnit}>entrenos</Text>
            </View>
            <Text style={styles.heroCaption}>Total acumulado en Neural</Text>
          </View>

          <View style={styles.streakCard}>
            <View style={styles.streakHeader}>
              <View>
                <Text style={styles.streakLabel}>Racha actual</Text>
                <View style={styles.streakValueRow}>
                  <Text style={styles.streakValue}>{personStreak}</Text>
                  <Text style={styles.streakUnit}>semanas</Text>
                </View>
              </View>
              {myStreak != null && (
                <Text style={styles.streakCompare}>Vos: {myStreak} semanas</Text>
              )}
            </View>
            <View style={styles.streakTrack}>
              <LinearGradient
                colors={[colors.accent, colors.accentDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.streakFill, { width: `${Math.round(streakRatio * 100)}%` }]}
              />
            </View>
          </View>

          <View style={styles.posts}>
            <View style={styles.postsHeader}>
              <Text style={styles.sectionTitle}>Sus publicaciones</Text>
              <Text style={styles.postsCount}>{profile.stats.posts_count} publicaciones</Text>
            </View>

            {profile.recent_posts.length === 0 ? (
              <View style={styles.emptyPosts}>
                <Feather name="file-text" size={22} color={colors.gray400} />
                <Text style={styles.emptyPostsTitle}>Sin publicaciones</Text>
                <Text style={styles.emptyPostsText}>
                  Todavía no compartió nada con la comunidad.
                </Text>
              </View>
            ) : photoPosts.length > 0 ? (
              <View style={styles.photoGrid}>
                {photoPosts.map((post) => (
                  <Pressable
                    key={post.id}
                    style={styles.photoTile}
                    onPress={() => handlePostPress(post.id)}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Ver la publicación"
                  >
                    <Image source={{ uri: post.image_url! }} style={styles.photoImage} resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.textRows}>
                {profile.recent_posts.map((post) => (
                  <Pressable
                    key={post.id}
                    style={({ pressed }) => [styles.textRow, pressed && styles.pressed]}
                    onPress={() => handlePostPress(post.id)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.textRowContent} numberOfLines={2}>
                      {post.content}
                    </Text>
                    <Text style={styles.textRowTime}>{post.time_ago}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
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
    gap: 20,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 8,
  },
  identityText: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.48,
    color: colors.ink,
  },
  meta: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.gray400,
  },
  rankBadge: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: '#109D2F',
  },
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  heroValue: {
    fontFamily: typography.fontFamily,
    fontSize: 64,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.64,
    color: colors.ink,
  },
  heroUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    color: colors.gray400,
  },
  heroCaption: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  streakCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  streakLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  streakValue: {
    fontFamily: typography.fontFamily,
    fontSize: 36,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.36,
    color: colors.ink,
  },
  streakUnit: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    color: colors.gray400,
  },
  streakCompare: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
  },
  streakTrack: {
    height: 10,
    borderRadius: 32,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  streakFill: {
    height: '100%',
    borderRadius: 32,
  },
  posts: {
    gap: 12,
  },
  postsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  postsCount: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: colors.gray400,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  photoTile: {
    flex: 1,
    height: 108,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  textRows: {
    gap: 8,
  },
  textRow: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  pressed: {
    opacity: 0.85,
  },
  textRowContent: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  textRowTime: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.gray400,
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
