import React from 'react';
import { View, Text } from 'react-native';
import { settingsStyles } from '../styles';

interface AppInfoSectionProps {
  version: string;
  build: string;
  developer?: string;
}

const AppInfoSection: React.FC<AppInfoSectionProps> = ({ version, build, developer = 'EMON Team' }) => {
  return (
    <View style={settingsStyles.section}>
      <Text style={settingsStyles.sectionTitle}>App Information</Text>
      <View style={settingsStyles.infoItem}>
        <Text style={settingsStyles.infoLabel}>Version</Text>
        <Text style={settingsStyles.infoValue}>{version}</Text>
      </View>
      <View style={settingsStyles.infoItem}>
        <Text style={settingsStyles.infoLabel}>Build</Text>
        <Text style={settingsStyles.infoValue}>{build}</Text>
      </View>
      <View style={settingsStyles.infoItem}>
        <Text style={settingsStyles.infoLabel}>Developer</Text>
        <Text style={settingsStyles.infoValue}>{developer}</Text>
      </View>
    </View>
  );
};

export default AppInfoSection;
