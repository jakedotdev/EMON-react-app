import React from 'react';
import { View, Text } from 'react-native';
import { settingsStyles } from '../styles';
import SettingItem from './SettingItem';

interface DataValues {
  autoSync: boolean;
  dataRetention: string;
  exportFormat: string;
}

interface DataManagementSectionProps {
  values: DataValues;
  onToggle: (setting: keyof DataValues, v: boolean) => void;
  onDataRetentionPress: () => void;
  onExportFormatPress: () => void;
}

const DataManagementSection: React.FC<DataManagementSectionProps> = ({ values, onToggle, onDataRetentionPress, onExportFormatPress }) => {
  return (
    <View style={settingsStyles.section}>
      <Text style={settingsStyles.sectionTitle}>Data Management</Text>
      <SettingItem label="Auto Sync" value={values.autoSync} onToggle={(v)=>onToggle('autoSync', v)} />
      <SettingItem label="Data Retention" value={values.dataRetention} isToggle={false} onPress={onDataRetentionPress} />
      <SettingItem label="Export Format" value={values.exportFormat} isToggle={false} onPress={onExportFormatPress} />
    </View>
  );
};

export default DataManagementSection;
