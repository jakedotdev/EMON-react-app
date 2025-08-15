import React from 'react';
import { View, Text } from 'react-native';
import { settingsStyles } from '../styles';
import SettingItem from './SettingItem';

interface NotificationsSectionProps {
  pushNotifications: boolean;
  onToggle: (v: boolean) => void;
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({ pushNotifications, onToggle }) => {
  return (
    <View style={settingsStyles.section}>
      <Text style={settingsStyles.sectionTitle}>Notifications</Text>
      <SettingItem label="Push Notifications" value={pushNotifications} onToggle={onToggle} />
    </View>
  );
};

export default NotificationsSection;
