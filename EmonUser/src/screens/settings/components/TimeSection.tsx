import React from 'react';
import { View, Text } from 'react-native';
import TimezonePicker from '../../auth/components/TimezonePicker';
import { settingsStyles } from '../styles';

interface TimeSectionProps {
  value: string;
  saving: boolean;
  onChange: (tz: string) => void;
}

const TimeSection: React.FC<TimeSectionProps> = ({ value, saving, onChange }) => {
  return (
    <View style={settingsStyles.section}>
      <Text style={settingsStyles.sectionTitle}>Time</Text>
      <TimezonePicker value={value} onChange={onChange} />
      {saving ? (
        <Text style={{ color: '#6B7280', marginTop: 6 }}>Saving timezone…</Text>
      ) : (
        <Text style={{ color: '#6B7280', marginTop: 6 }}>Used for accurate time displays and analytics.</Text>
      )}
    </View>
  );
};

export default TimeSection;
