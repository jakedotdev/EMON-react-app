import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { settingsStyles } from '../styles';

interface SupportSectionProps {
  onHelp?: () => void;
  onContact?: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
  onAbout?: () => void;
}

const SupportSection: React.FC<SupportSectionProps> = ({ onHelp, onContact, onPrivacy, onTerms, onAbout }) => {
  return (
    <View style={settingsStyles.section}>
      <Text style={settingsStyles.sectionTitle}>Support</Text>
      <TouchableOpacity style={settingsStyles.actionButton} onPress={onAbout}>
        <Text style={settingsStyles.actionButtonText}>About</Text>
      </TouchableOpacity>
      <TouchableOpacity style={settingsStyles.actionButton} onPress={onHelp}>
        <Text style={settingsStyles.actionButtonText}>Help & FAQ</Text>
      </TouchableOpacity>
      <TouchableOpacity style={settingsStyles.actionButton} onPress={onContact}>
        <Text style={settingsStyles.actionButtonText}>Contact Support</Text>
      </TouchableOpacity>
      <TouchableOpacity style={settingsStyles.actionButton} onPress={onPrivacy}>
        <Text style={settingsStyles.actionButtonText}>Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity style={settingsStyles.actionButton} onPress={onTerms}>
        <Text style={settingsStyles.actionButtonText}>Terms of Service</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SupportSection;
