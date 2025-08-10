import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TimePeriod } from '../managers/AnalyticsDataManager';

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const timePeriods: TimePeriod[] = ['Realtime', 'Daily', 'Weekly', 'Monthly'];

  return (
    <View style={styles.container}>
      {timePeriods.map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonSelected,
          ]}
          onPress={() => onPeriodChange(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextSelected,
            ]}
          >
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  periodButton: {
    flex: 1,
    backgroundColor: '#D3E6BF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonSelected: {
    backgroundColor: '#5B934E',
  },
  periodButtonText: {
    color: '#467933',
    fontWeight: 'bold',
    fontSize: 12,
  },
  periodButtonTextSelected: {
    color: '#FFFFFF',
  },
});

export default TimePeriodSelector;
