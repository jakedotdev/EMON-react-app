import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';

const SettingsScreen: React.FC = () => {
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

  const renderSettingItem = (
    label: string,
    value: boolean | string,
    onPress?: () => void,
    isToggle: boolean = true
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.settingLabel}>{label}</Text>
      {isToggle ? (
        <Switch
          value={value as boolean}
          onValueChange={(newValue) => {
            // Find the category and setting name
            Object.keys(settings).forEach(category => {
              const categorySettings = settings[category as keyof typeof settings];
              if (typeof categorySettings === 'object' && categorySettings !== null) {
                Object.keys(categorySettings).forEach(setting => {
                  if (categorySettings[setting as keyof typeof categorySettings] === value) {
                    handleToggleSetting(category, setting, newValue);
                  }
                });
              }
            });
          }}
          trackColor={{ false: '#D3E6BF', true: '#5B934E' }}
          thumbColor={value ? '#FFFFFF' : '#467933'}
        />
      ) : (
        <View style={styles.settingValue}>
          <Text style={styles.settingValueText}>{value}</Text>
          {onPress && <Text style={styles.settingArrow}>›</Text>}
  </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {renderSettingItem('Push Notifications', settings.notifications.pushNotifications)}
        {renderSettingItem('Email Notifications', settings.notifications.emailNotifications)}
        {renderSettingItem('Energy Alerts', settings.notifications.energyAlerts)}
        {renderSettingItem('Device Alerts', settings.notifications.deviceAlerts)}
        {renderSettingItem('Weekly Reports', settings.notifications.weeklyReports)}
      </View>

      {/* Display */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display</Text>
        {renderSettingItem('Dark Mode', settings.display.darkMode)}
        {renderSettingItem('Compact Mode', settings.display.compactMode)}
        {renderSettingItem('Show Animations', settings.display.showAnimations)}
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        {renderSettingItem('Auto Sync', settings.data.autoSync)}
        {renderSettingItem('Data Retention', settings.data.dataRetention, handleDataRetentionChange, false)}
        {renderSettingItem('Export Format', settings.data.exportFormat, handleExportFormatChange, false)}
      </View>

      {/* Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        {renderSettingItem('Biometric Authentication', settings.security.biometricAuth)}
        {renderSettingItem('Auto Lock', settings.security.autoLock)}
        {renderSettingItem('Session Timeout', settings.security.sessionTimeout, handleSessionTimeoutChange, false)}
      </View>

      {/* App Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Build</Text>
          <Text style={styles.infoValue}>2024.01.01</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Developer</Text>
          <Text style={styles.infoValue}>EMON Team</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Export Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Clear Cache</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Reset Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>About</Text>
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Help & FAQ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Contact Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5B934E',
  },

  section: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B934E',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 16,
    color: '#666',
    marginRight: 10,
  },
  settingArrow: {
    fontSize: 18,
    color: '#5B934E',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
  },
  actionButton: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#5B934E',
  },
});

export default SettingsScreen;
