import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import DashboardScreen from '../screens/dashboard/DashboardScreenRefactored';
import AppliancesScreen from '../screens/appliances/AppliancesScreen';
import AnalyticsScreenRefactored from '../screens/analytics/AnalyticsScreenRefactored';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator();

// Custom tab bar icons
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
    <Text style={[styles.tabIconText, focused && styles.tabIconTextFocused]}>
      {name.charAt(0).toUpperCase()}
    </Text>
  </View>
);

const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#5B934E',
      tabBarInactiveTintColor: '#9CC39C',
      tabBarStyle: styles.tabBar,
      headerShown: false,
    }}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={DashboardScreen}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon name="Dashboard" focused={focused} />,
      }}
    />
    <Tab.Screen 
      name="Appliances" 
      component={AppliancesScreen}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon name="Appliances" focused={focused} />,
      }}
    />
    <Tab.Screen 
      name="Analytics" 
      component={AnalyticsScreenRefactored}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon name="Analytics" focused={focused} />,
      }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
      }}
    />
    <Tab.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon name="Settings" focused={focused} />,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D3E6BF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconFocused: {
    backgroundColor: '#5B934E',
  },
  tabIconText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#467933',
  },
  tabIconTextFocused: {
    color: '#FFFFFF',
  },
});

export default MainTabNavigator;
