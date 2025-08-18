import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardStackNavigator from './DashboardStackNavigator';
import AppliancesScreen from '../screens/appliances/AppliancesScreen';
import AnalyticsScreenRefactored from '../screens/analytics/AnalyticsScreenRefactored';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsStackNavigator from './SettingsStackNavigator';

const Tab = createBottomTabNavigator();

// Animated tab icon with MaterialCommunityIcons
const TabIcon = ({ icon, focused, label }: { icon: string; focused: boolean; label: string }) => {
  const scale = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [focused, scale]);

  const translateY = scale.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const iconScale = scale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Animated.View style={[styles.tabIcon, { transform: [{ translateY }, { scale: iconScale }] }, focused && styles.tabIconFocused]}>
      <Icon name={icon} size={22} color={focused ? '#FFFFFF' : '#467933'} />
    </Animated.View>
  );
};

const MainTabNavigator = () => (
  <Tab.Navigator
    initialRouteName="Dashboard"
    screenOptions={{
      tabBarActiveTintColor: '#5B934E',
      tabBarInactiveTintColor: '#9CC39C',
      tabBarStyle: styles.tabBar,
      headerShown: false,
      tabBarLabelStyle: styles.tabLabel,
    }}
  >
    {/* Order: Profile (left), Appliances, Dashboard (center), Analytics, Settings */}
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="account-circle" label="Profile" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Appliances"
      component={AppliancesScreen}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="power-plug" label="Appliances" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardStackNavigator}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="view-dashboard" label="Dashboard" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Analytics"
      component={AnalyticsScreenRefactored}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="chart-bar" label="Analytics" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsStackNavigator}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="cog" label="Settings" focused={focused} />,
      }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#D3E6BF',
    borderTopWidth: 1,
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
  },

  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D3E6BF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconFocused: {
    backgroundColor: '#5B934E',
  },
  tabLabel: {
    fontSize: 11,
  },
});

export default MainTabNavigator;
