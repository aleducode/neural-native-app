import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Screens
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CommunityScreen from '../screens/CommunityScreen';
import TrainingsScreen from '../screens/TrainingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: Platform.select({
              android: Math.max(insets.bottom, 8),
              ios: 20,
              default: 20,
            }),
            height: Platform.select({
              android: 80 + Math.max(insets.bottom - 8, 0),
              ios: 80,
              default: 80,
            }),
          },
        ],
        tabBarItemStyle: styles.tabBarItem,
        // The bar keeps its dark ground, as the design's floating navbar does.
        // The active tint moves off the legacy blue onto the brand accent,
        // which is what the rest of the migrated screens now use.
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.55)',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={focused ? colors.accent : color}
            />
          ),
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={focused ? colors.accent : color}
            />
          ),
          tabBarLabel: 'Calendario',
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={24}
              color={focused ? colors.accent : color}
            />
          ),
          tabBarLabel: 'Comunidad',
        }}
      />
      <Tab.Screen
        name="Trainings"
        component={TrainingsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'barbell' : 'barbell-outline'}
              size={24}
              color={focused ? colors.accent : color}
            />
          ),
          tabBarLabel: 'Entrenos',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={focused ? colors.accent : color}
            />
          ),
          tabBarLabel: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.gray600,
    borderTopWidth: 0,
    elevation: 0,
    paddingTop: 8,
    paddingHorizontal: 0,
  },
  tabBarItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabBarLabel: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontWeight: '500',
  },
});
