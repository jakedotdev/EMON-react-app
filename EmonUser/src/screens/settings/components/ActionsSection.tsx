import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { settingsStyles } from '../styles';

interface ActionsSectionProps {
  onExportData?: () => void;
  onClearCache?: () => void;
  onResetSettings?: () => void;
  onAbout?: () => void;
}

const ActionsSection: React.FC<ActionsSectionProps> = ({ onExportData, onClearCache, onResetSettings, onAbout }) => {
  return (
    <View style={settingsStyles.section}>
      <Text style={settingsStyles.sectionTitle}>Actions</Text>
      <TouchableOpacity style={settingsStyles.actionButton} onPress={onExportData}>
        <Text style={settingsStyles.actionButtonText}>Export Data</Text>
      </TouchableOpacity>
      <TouchableOpacity style={settingsStyles.actionButton} onPress={onClearCache}>
        <Text style={settingsStyles.actionButtonText}>Clear Cache</Text>
      </TouchableOpacity>
      <TouchableOpacity style={settingsStyles.actionButton} onPress={onResetSettings}>
        <Text style={settingsStyles.actionButtonText}>Reset Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={settingsStyles.actionButton} onPress={onAbout}>
        <Text style={settingsStyles.actionButtonText}>About</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ActionsSection;
