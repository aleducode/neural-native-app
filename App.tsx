import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import BottomTabs from './src/navigation/BottomTabs';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PendingScreen from './src/screens/PendingScreen';
import MembershipScreen from './src/screens/MembershipScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SlotDetailScreen from './src/screens/SlotDetailScreen';
import BookingConfirmationScreen from './src/screens/BookingConfirmationScreen';
import WeightInputScreen from './src/screens/WeightInputScreen';
import WeightHistoryScreen from './src/screens/WeightHistoryScreen';
import BirthdateInputScreen from './src/screens/BirthdateInputScreen';
import HeightInputScreen from './src/screens/HeightInputScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="Membership" component={MembershipScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SlotDetail" component={SlotDetailScreen} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
      <Stack.Screen name="WeightInput" component={WeightInputScreen} />
      <Stack.Screen name="WeightHistory" component={WeightHistoryScreen} />
      <Stack.Screen name="BirthdateInput" component={BirthdateInputScreen} />
      <Stack.Screen name="HeightInput" component={HeightInputScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgDark }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  // Check if user is verified - if not, show PendingScreen
  if (user && !user.is_verified) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Pending" component={PendingScreen} />
      </Stack.Navigator>
    );
  }

  return <MainStack />;
}

export default function App() {
  // System fonts nativas - no necesitan carga, están disponibles inmediatamente
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
