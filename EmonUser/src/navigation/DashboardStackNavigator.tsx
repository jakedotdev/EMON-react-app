import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreenRefactored from '../screens/dashboard/DashboardScreenRefactored';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

export type DashboardStackParamList = {
  DashboardMain: undefined;
  Notifications: undefined;
};

const Stack = createStackNavigator<DashboardStackParamList>();

const DashboardStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={DashboardScreenRefactored} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};

export default DashboardStackNavigator;
