import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SettingsScreen from '../screens/settings/SettingsScreen';
import AboutScreen from '../screens/settings/support/AboutScreen';
import HelpFaqScreen from '../screens/settings/support/HelpFaqScreen';
import ContactSupportScreen from '../screens/settings/support/ContactSupportScreen';
import PrivacyPolicyScreen from '../screens/settings/support/PrivacyPolicyScreen.tsx';
import TermsOfServiceScreen from '../screens/settings/support/TermsOfServiceScreen.tsx';
import MyReportsScreen from '../screens/settings/support/MyReportsScreen';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  About: undefined;
  HelpFAQ: undefined;
  ContactSupport: undefined;
  MyReports: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

const Stack = createStackNavigator<SettingsStackParamList>();

const SettingsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          paddingVertical: 20,
          height: 72,
          borderBottomColor: '#E0E0E0',
        },
        headerTitleStyle: {
          color: '#5B934E',
          fontWeight: 'bold',
          fontSize: 24,
          paddingVertical: 20,
        },
        headerTintColor: '#5B934E',
        headerTitleAlign: 'left',
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings', headerShown: true }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      <Stack.Screen name="HelpFAQ" component={HelpFaqScreen} options={{ title: 'Help & FAQ' }} />
      <Stack.Screen name="ContactSupport" component={ContactSupportScreen} options={{ title: 'Contact Support' }} />
      <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ title: 'My Reports' }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ title: 'Terms of Service' }} />
    </Stack.Navigator>
  );
};

export default SettingsStackNavigator;
