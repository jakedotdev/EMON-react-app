import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChartData, TimePeriod } from '../managers/AnalyticsDataManager';
import { SensorReadingModel } from '../../../models/SensorReading';
import { AnalyticsCalculator } from '../utils/AnalyticsCalculator';

interface RecommendationsSectionProps {
  chartData: ChartData;
  selectedPeriod: TimePeriod;
  sensors: { [key: string]: SensorReadingModel };
}

const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  chartData,
  selectedPeriod,
  sensors,
}) => {
  const recommendations = AnalyticsCalculator.generateRecommendations(
    chartData,
    selectedPeriod,
    sensors
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommendations</Text>
      {recommendations.map((recommendation, index) => (
        <View key={index} style={styles.recommendationItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.recommendationText}>{recommendation}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B934E',
    marginBottom: 15,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    color: '#5B934E',
    marginRight: 10,
    marginTop: 2,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default RecommendationsSection;
