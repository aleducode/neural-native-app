import { useCallback } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, SetupRoute } from '../navigation/RootNavigator';

/**
 * Walks the profile-setup sheet's fields one after another.
 *
 * The sheet opens the first missing field with the rest as `setupQueue`; each
 * field screen calls `advance` once saved, which opens the next one in place
 * or, after the last, returns to where the sheet was.
 */
export function useSetupQueue() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, SetupRoute>>();
  const queue = route.params?.setupQueue;

  const advance = useCallback(() => {
    const [next, ...rest] = queue ?? [];
    if (next) {
      navigation.replace(next, { setupQueue: rest });
    } else {
      navigation.goBack();
    }
  }, [navigation, queue]);

  return { inSetup: queue !== undefined, advance };
}
