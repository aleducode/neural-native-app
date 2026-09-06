import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FloatingTabBar from '../components/ui/FloatingTabBar';

// Screens
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CommunityScreen from '../screens/CommunityScreen';
import TrainingsScreen from '../screens/TrainingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      // The design's navigation is a floating pill, which no amount of
      // tabBarStyle can express — it lives outside the bar's own box and
      // carries an action slot that is not a route. Hence a custom bar.
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
      />
      <Tab.Screen
        name="Trainings"
        component={TrainingsScreen}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}
