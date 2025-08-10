import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SummaryCardData } from '../../../services/analytics/EnergyCalculationService';
import { TimePeriod } from '../managers/AnalyticsDataManager';

interface SummaryCardsProps {
  summaryCardData: SummaryCardData;
  selectedPeriod: TimePeriod;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summaryCardData, selectedPeriod }) => {
  const { totalValue, totalLabel, avgValue, avgLabel, peakValue, peakLabel, peakDetail } = summaryCardData;

  const formatValue = (value: number) => {
    // All values are now in kWh, so format accordingly
    switch (selectedPeriod) {
      case 'Realtime':
        return `${value.toFixed(3)}kWh`; // More precision for small real-time values
      case 'Daily':
        return `${value.toFixed(2)}kWh`; // Standard precision for hourly values
      case 'Weekly':
      case 'Monthly':
        return `${value.toFixed(1)}kWh`; // Less precision for larger daily values
      default:
        return `${value.toFixed(2)}kWh`;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{totalLabel}</Text>
        <Text style={styles.summaryValue}>{formatValue(totalValue)}</Text>
      </View>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{avgLabel}</Text>
        <Text style={styles.summaryValue}>{formatValue(avgValue)}</Text>
      </View>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{peakLabel}</Text>
        <Text style={styles.summaryValue}>{formatValue(peakValue)}</Text>
        {peakDetail && (
          <Text style={styles.summaryDetail}>{peakDetail}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5B934E',
    textAlign: 'center',
  },
  summaryDetail: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default SummaryCards;
