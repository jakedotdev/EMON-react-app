import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { settingsStyles } from '../styles';

interface SettingItemProps {
  label: string;
  value: boolean | string;
  isToggle?: boolean;
  onPress?: () => void;
  onToggle?: (v: boolean) => void;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, value, isToggle = true, onPress, onToggle }) => {
  return (
    <TouchableOpacity
      style={settingsStyles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={settingsStyles.settingLabel}>{label}</Text>
      {isToggle ? (
        <Switch
          value={Boolean(value)}
          onValueChange={(v) => onToggle && onToggle(v)}
          trackColor={{ false: '#D3E6BF', true: '#5B934E' }}
          thumbColor={value ? '#FFFFFF' : '#467933'}
        />
      ) : (
        <View style={settingsStyles.settingValue}>
          <Text style={settingsStyles.settingValueText}>{String(value)}</Text>
          {onPress && <Text style={settingsStyles.settingArrow}>›</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default SettingItem;
