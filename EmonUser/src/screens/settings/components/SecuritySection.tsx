import React from 'react';
import { View, Text } from 'react-native';
import { settingsStyles } from '../styles';
import SettingItem from './SettingItem';

interface SecurityValues {
  biometricAuth: boolean;
  autoLock: boolean;
  sessionTimeout: string;
}

interface SecuritySectionProps {
  values: SecurityValues;
  onToggle: (setting: keyof Omit<SecurityValues, 'sessionTimeout'>, v: boolean) => void;
  onSessionTimeoutPress: () => void;
}

const SecuritySection: React.FC<SecuritySectionProps> = ({ values, onToggle, onSessionTimeoutPress }) => {
  return (
    <View style={settingsStyles.section}>
      <Text style={settingsStyles.sectionTitle}>Security</Text>
      <SettingItem label="Biometric Authentication" value={values.biometricAuth} onToggle={(v)=>onToggle('biometricAuth', v)} />
      <SettingItem label="Auto Lock" value={values.autoLock} onToggle={(v)=>onToggle('autoLock', v)} />
      <SettingItem label="Session Timeout" value={values.sessionTimeout} isToggle={false} onPress={onSessionTimeoutPress} />
    </View>
  );
};

export default SecuritySection;
