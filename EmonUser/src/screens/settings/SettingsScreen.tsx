import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { SettingsStackParamList } from '../../navigation/SettingsStackNavigator';
// Removed direct auth and profile service usage in favor of SettingsDataManager
import { settingsDataManager } from './managers/SettingsDataManager';
import { settingsStyles } from './styles';
import TimeSection from './components/TimeSection';
import NotificationsSection from './components/NotificationsSection';
import AppInfoSection from './components/AppInfoSection';
import SupportSection from './components/SupportSection';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<SettingsStackParamList>>();
  const [settings, setSettings] = useState({
    notifications: {
      pushNotifications: true,
      emailNotifications: false,
      energyAlerts: true,
      deviceAlerts: true,
      weeklyReports: true,
    },
    display: {
      darkMode: false,
      compactMode: false,
      showAnimations: true,
    },
    data: {
      autoSync: true,
      dataRetention: '30 days',
      exportFormat: 'CSV',
    },
    security: {
      biometricAuth: false,
      autoLock: true,
      sessionTimeout: '30 minutes',
    },
  });

  const [preferredTimezone, setPreferredTimezone] = useState<string>('UTC');
  const [savingTimezone, setSavingTimezone] = useState<boolean>(false);

  useEffect(() => {
    const loadTimezone = async () => {
      const tz = await settingsDataManager.loadPreferredTimezone();
      setPreferredTimezone(tz);
    };
    loadTimezone();
  }, []);

  const handleTimezoneChange = async (tz: string) => {
    if (!settingsDataManager.validateTimezone(tz)) {
      Alert.alert('Invalid timezone', 'Please select a valid IANA timezone.');
      return;
    }
    setPreferredTimezone(tz);
    settingsDataManager.applyTimeZone(tz);
    try {
      setSavingTimezone(true);
      await settingsDataManager.savePreferredTimezone(tz);
    } catch (e) {
      Alert.alert('Error', 'Failed to save timezone. It will still apply locally.');
    } finally {
      setSavingTimezone(false);
    }
  };

  const handleToggleSetting = (category: string, setting: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value,
      },
    }));
  };

  const handleDataRetentionChange = () => {
    Alert.alert(
      'Data Retention',
      'Select data retention period',
      [
        { text: '7 days', onPress: () => updateDataSetting('dataRetention', '7 days') },
        { text: '30 days', onPress: () => updateDataSetting('dataRetention', '30 days') },
        { text: '90 days', onPress: () => updateDataSetting('dataRetention', '90 days') },
        { text: '1 year', onPress: () => updateDataSetting('dataRetention', '1 year') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleExportFormatChange = () => {
    Alert.alert(
      'Export Format',
      'Select export format',
      [
        { text: 'CSV', onPress: () => updateDataSetting('exportFormat', 'CSV') },
        { text: 'JSON', onPress: () => updateDataSetting('exportFormat', 'JSON') },
        { text: 'PDF', onPress: () => updateDataSetting('exportFormat', 'PDF') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSessionTimeoutChange = () => {
    Alert.alert(
      'Session Timeout',
      'Select session timeout',
      [
        { text: '15 minutes', onPress: () => updateSecuritySetting('sessionTimeout', '15 minutes') },
        { text: '30 minutes', onPress: () => updateSecuritySetting('sessionTimeout', '30 minutes') },
        { text: '1 hour', onPress: () => updateSecuritySetting('sessionTimeout', '1 hour') },
        { text: 'Never', onPress: () => updateSecuritySetting('sessionTimeout', 'Never') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updateDataSetting = (setting: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [setting]: value,
      },
    }));
  };

  const updateSecuritySetting = (setting: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [setting]: value,
      },
    }));
  };

  // Section components handle rendering of individual rows

  return (
    <ScrollView style={settingsStyles.container}>

      <TimeSection value={preferredTimezone} saving={savingTimezone} onChange={handleTimezoneChange} />

      <NotificationsSection
        pushNotifications={settings.notifications.pushNotifications}
        onToggle={(v: boolean) => handleToggleSetting('notifications', 'pushNotifications', v)}
      />

      <AppInfoSection version="1.0.0" build="2024.01.01" developer="EMON Team" />

      <SupportSection
        onAbout={() => navigation.navigate('About')}
        onHelp={() => navigation.navigate('HelpFAQ')}
        onContact={() => navigation.navigate('ContactSupport')}
        onPrivacy={() => navigation.navigate('PrivacyPolicy')}
        onTerms={() => navigation.navigate('TermsOfService')}
      />
    </ScrollView>
  );
};
export default SettingsScreen;
