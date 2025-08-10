import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChartData, TimePeriod } from '../managers/AnalyticsDataManager';
import { SensorReadingModel } from '../../../models/SensorReading';
import { AnalyticsCalculator } from '../utils/AnalyticsCalculator';

interface AnalysisSectionProps {
  chartData: ChartData;
  selectedPeriod: TimePeriod;
  sensors: { [key: string]: SensorReadingModel };
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  chartData,
  selectedPeriod,
  sensors,
}) => {
  const analysisText = AnalyticsCalculator.generateAnalysisText(
    chartData,
    selectedPeriod,
    sensors
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analysis</Text>
      <Text style={styles.text}>{analysisText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default AnalysisSection;
