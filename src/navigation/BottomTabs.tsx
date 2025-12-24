import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../theme/colors';

// Screens
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import TrainingsScreen from '../screens/TrainingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.gray400,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarButton: (props) => (
            <View style={styles.tabBarItem}>
              <Pressable
                {...props}
                style={({ pressed }) => [
                  styles.pressableWrapper,
                  pressed && { opacity: 0.7 },
                ]}
              >
                {props.children}
              </Pressable>
            </View>
          ),
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.iconWrapperActive} />}
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={focused ? 'home' : 'home-outline'}
                  size={24}
                  color={focused ? colors.black : color}
                />
              </View>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarButton: (props) => (
            <View style={styles.tabBarItem}>
              <Pressable
                {...props}
                style={({ pressed }) => [
                  styles.pressableWrapper,
                  pressed && { opacity: 0.7 },
                ]}
              >
                {props.children}
              </Pressable>
            </View>
          ),
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.iconWrapperActive} />}
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={focused ? 'calendar' : 'calendar-outline'}
                  size={24}
                  color={focused ? colors.black : color}
                />
              </View>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Trainings"
        component={TrainingsScreen}
        options={{
          tabBarButton: (props) => (
            <View style={styles.tabBarItem}>
              <Pressable
                {...props}
                style={({ pressed }) => [
                  styles.pressableWrapper,
                  pressed && { opacity: 0.7 },
                ]}
              >
                {props.children}
              </Pressable>
            </View>
          ),
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.iconWrapperActive} />}
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={focused ? 'barbell' : 'barbell-outline'}
                  size={24}
                  color={focused ? colors.black : color}
                />
              </View>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarButton: (props) => (
            <View style={styles.tabBarItem}>
              <Pressable
                {...props}
                style={({ pressed }) => [
                  styles.pressableWrapper,
                  pressed && { opacity: 0.7 },
                ]}
              >
                {props.children}
              </Pressable>
            </View>
          ),
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.iconWrapperActive} />}
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={focused ? 'person' : 'person-outline'}
                  size={24}
                  color={focused ? colors.black : color}
                />
              </View>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tabBarItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    minWidth: 0,
    overflow: 'visible',
  },
  pressableWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 70,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    position: 'relative',
  },
  iconWrapperActive: {
    backgroundColor: colors.primary,
    width: 70,
    height: 50,
    borderRadius: borderRadius.md,
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
  },
});
