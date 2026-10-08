import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { videosApi } from '../api/videos';

const SEEN_KEY = 'neural_exercises_seen_at';

/**
 * How long an answer is good for.
 *
 * This hook runs on every focus of the trainings screen, and the only endpoint
 * that carries `assigned_at` returns the whole catalogue — the same over-fetch
 * the detail screens were just moved off. A module does not get assigned twice
 * in a minute, so a few minutes of staleness costs the member nothing and saves
 * a full download every time they tap between tabs.
 */
const FRESH_FOR_MS = 5 * 60 * 1000;

let lastChecked = 0;
let lastAnswer = false;

/**
 * Whether a module arrived since the member last looked at the exercises tab.
 *
 * This drives the green dot on the tab, which the design calls "Punto nuevo".
 * With no push notification on assignment — that needs the owner's sign-off
 * because assigning to a whole plan would be a mass send — this dot is the only
 * way a member finds out something new is waiting.
 *
 * The "seen" mark lives on the device on purpose: the server has no business
 * tracking what a member has glanced at, and the answer only has to be right
 * for the person holding the phone.
 */
export function useNewExercises() {
  const [hasNew, setHasNew] = useState(lastAnswer);

  const check = useCallback(async (force = false) => {
    if (!force && Date.now() - lastChecked < FRESH_FOR_MS) {
      setHasNew(lastAnswer);
      return;
    }

    const [seenRaw, { data }] = await Promise.all([
      AsyncStorage.getItem(SEEN_KEY).catch(() => null),
      videosApi.getPackages(),
    ]);

    lastChecked = Date.now();
    const packages = data?.packages ?? [];
    if (packages.length === 0) {
      lastAnswer = false;
      setHasNew(false);
      return;
    }

    // Never looked: anything assigned counts as new.
    const seen = seenRaw ? Date.parse(seenRaw) : 0;
    const newest = packages.reduce((latest, pkg) => {
      const at = pkg.assigned_at ? Date.parse(pkg.assigned_at) : 0;
      return Number.isNaN(at) ? latest : Math.max(latest, at);
    }, 0);

    lastAnswer = newest > seen;
    setHasNew(lastAnswer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      check().catch(() => {
        // A failed check is not news. Leaving the dot alone beats inventing one.
        if (alive) setHasNew(false);
      });
      return () => {
        alive = false;
      };
    }, [check])
  );

  /** Called when the member actually opens the tab. */
  const markSeen = useCallback(async () => {
    lastAnswer = false;
    setHasNew(false);
    await AsyncStorage.setItem(SEEN_KEY, new Date().toISOString()).catch(() => {});
  }, []);

  return { hasNew, markSeen };
}
