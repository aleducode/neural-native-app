import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_BAR_MARGIN = 32; // Margen fijo a cada lado

// Screens
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.white,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarButton: (props) => {
            const { children, onPress, accessibilityState } = props;
            const isFocused = accessibilityState?.selected;
            return (
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                style={[
                  styles.tabBarButton,
                  isFocused && styles.tabBarButtonActive,
                ]}
                accessibilityState={accessibilityState}
              >
                {children}
              </TouchableOpacity>
            );
          },
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={focused ? colors.primary : color}
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
              color={focused ? colors.primary : color}
            />
          ),
          tabBarLabel: 'Calendario',
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
              color={focused ? colors.primary : color}
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
              color={focused ? colors.primary : color}
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
  tabBarButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  tabBarButtonActive: {
    backgroundColor: colors.gray500,
  },
});
