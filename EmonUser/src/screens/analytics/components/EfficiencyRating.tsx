import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChartData } from '../managers/AnalyticsDataManager';
import { AnalyticsCalculator } from '../utils/AnalyticsCalculator';

interface EfficiencyRatingProps {
  chartData: ChartData;
}

const EfficiencyRating: React.FC<EfficiencyRatingProps> = ({ chartData }) => {
  const efficiency = AnalyticsCalculator.calculateEfficiencyRating(chartData);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Efficiency Rating</Text>
      <View style={styles.card}>
        <Text style={[styles.rating, { color: efficiency.color }]}>
          {efficiency.rating}
        </Text>
        <Text style={styles.description}>{efficiency.description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#467933',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rating: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default EfficiencyRating;
