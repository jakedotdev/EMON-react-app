import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { sensorService } from '../../services/sensors/sensorService';
import { SensorReadingModel } from '../../models/SensorReading';

type TimePeriod = 'Realtime' | 'Daily' | 'Weekly' | 'Monthly';

interface ChartData {
  labels: string[];
  data: number[];
  total: number;
  average: number;
  peak: number;
  low: number;
}

const AnalyticsScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Realtime');
  const [sensors, setSensors] = useState<{ [key: string]: SensorReadingModel }>({});
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    data: [],
    total: 0,
    average: 0,
    peak: 0,
    low: 0,
  });

  const timePeriods: TimePeriod[] = ['Realtime', 'Daily', 'Weekly', 'Monthly'];

  useEffect(() => {
    loadSensorData();
  }, []);

  useEffect(() => {
    generateChartData();
  }, [selectedPeriod, sensors]);

  const loadSensorData = () => {
    const unsubscribe = sensorService.listenToAllSensors((sensorData) => {
      setSensors(sensorData);
    });

    return unsubscribe;
  };

  const generateChartData = () => {
    let labels: string[] = [];
    let data: number[] = [];

    switch (selectedPeriod) {
      case 'Realtime':
        // Last 6 data points (10 seconds apart)
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 10000);
          labels.push(`${time.getMinutes()}:${time.getSeconds().toString().padStart(2, '0')}`);
        }
        data = [120, 135, 98, 156, 142, 128]; // Mock real-time data
        break;

      case 'Daily':
        // Last 24 hours
        for (let i = 23; i >= 0; i--) {
          const hour = (24 + (new Date().getHours() - i)) % 24;
          labels.push(`${hour}:00`);
        }
        data = Array.from({ length: 24 }, () => Math.floor(Math.random() * 200) + 50);
        break;

      case 'Weekly':
        // Last 7 days
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        labels = days;
        data = Array.from({ length: 7 }, () => Math.floor(Math.random() * 1000) + 200);
        break;

      case 'Monthly':
        // Last 30 days
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
        }
        data = Array.from({ length: 30 }, () => Math.floor(Math.random() * 2000) + 500);
        break;
    }

    const total = data.reduce((sum, value) => sum + value, 0);
    const average = total / data.length;
    const peak = Math.max(...data);
    const low = Math.min(...data);

    setChartData({ labels, data, total, average, peak, low });
  };

  const getAnalysisText = () => {
    const { average, peak, low, total } = chartData;
    
    switch (selectedPeriod) {
      case 'Realtime':
        return `Current power consumption is ${average.toFixed(1)}W. Peak usage was ${peak}W and lowest was ${low}W. Total energy consumed in this period is ${(total / 3600).toFixed(3)}kWh.`;
      
      case 'Daily':
        return `Average daily consumption is ${average.toFixed(1)}W. Peak usage occurred at ${chartData.labels[chartData.data.indexOf(peak)]} with ${peak}W. Total daily energy consumption is ${(total / 1000).toFixed(2)}kWh.`;
      
      case 'Weekly':
        return `Weekly average consumption is ${average.toFixed(1)}W. Highest consumption was on ${chartData.labels[chartData.data.indexOf(peak)]} with ${peak}W. Total weekly energy consumption is ${(total / 1000).toFixed(2)}kWh.`;
      
      case 'Monthly':
        return `Monthly average consumption is ${average.toFixed(1)}W. Peak usage was on ${chartData.labels[chartData.data.indexOf(peak)]} with ${peak}W. Total monthly energy consumption is ${(total / 1000).toFixed(2)}kWh.`;
      
      default:
        return '';
    }
  };

  const getEfficiencyRating = () => {
    const { average } = chartData;
    
    if (average < 100) return { rating: 'Excellent', color: '#5B934E' };
    if (average < 200) return { rating: 'Good', color: '#9CC39C' };
    if (average < 300) return { rating: 'Fair', color: '#FFA726' };
    return { rating: 'High', color: '#F44336' };
  };

  const renderSimpleChart = () => {
    const maxValue = Math.max(...chartData.data);
    const minValue = Math.min(...chartData.data);
    const range = maxValue - minValue;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{selectedPeriod} Energy Consumption</Text>
          <Text style={styles.chartSubtitle}>
            {selectedPeriod === 'Realtime' ? 'Last 60 seconds' : 
             selectedPeriod === 'Daily' ? 'Last 24 hours' :
             selectedPeriod === 'Weekly' ? 'Last 7 days' : 'Last 30 days'}
          </Text>
        </View>
        
        <View style={styles.chartArea}>
          <View style={styles.chartBars}>
            {chartData.data.map((value, index) => {
              const height = range > 0 ? ((value - minValue) / range) * 150 : 0;
              return (
                <View key={index} style={styles.barContainer}>
                  <View style={[styles.bar, { height: Math.max(height, 5) }]} />
                  <Text style={styles.barLabel}>{chartData.labels[index]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      {/* Time Period Selector */}
      <View style={styles.periodSelector}>
        {timePeriods.map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonSelected
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextSelected
            ]}>
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>
            {selectedPeriod === 'Realtime' ? 
              `${(chartData.total / 3600).toFixed(3)} kWh` :
              `${(chartData.total / 1000).toFixed(2)} kWh`
            }
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Average</Text>
          <Text style={styles.summaryValue}>{chartData.average.toFixed(1)}W</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Peak</Text>
          <Text style={styles.summaryValue}>{chartData.peak}W</Text>
        </View>
      </View>

      {/* Efficiency Rating */}
      <View style={styles.efficiencyContainer}>
        <Text style={styles.efficiencyLabel}>Efficiency Rating</Text>
        <View style={styles.efficiencyCard}>
          <Text style={[
            styles.efficiencyRating,
            { color: getEfficiencyRating().color }
          ]}>
            {getEfficiencyRating().rating}
          </Text>
          <Text style={styles.efficiencyDescription}>
            Based on your {selectedPeriod.toLowerCase()} consumption patterns
          </Text>
        </View>
      </View>

      {/* Chart */}
      {renderSimpleChart()}

      {/* Analysis */}
      <View style={styles.analysisContainer}>
        <Text style={styles.analysisTitle}>Analysis</Text>
        <Text style={styles.analysisText}>{getAnalysisText()}</Text>
      </View>

      {/* Recommendations */}
      <View style={styles.recommendationsContainer}>
        <Text style={styles.recommendationsTitle}>Recommendations</Text>
        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationBullet}>•</Text>
          <Text style={styles.recommendationText}>
            Consider using energy-efficient appliances during peak hours
          </Text>
        </View>
        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationBullet}>•</Text>
          <Text style={styles.recommendationText}>
            Monitor appliances with high power consumption
          </Text>
        </View>
        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationBullet}>•</Text>
          <Text style={styles.recommendationText}>
            Schedule non-essential devices to run during off-peak hours
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D3E6BF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5B934E',
  },
  periodSelector: {
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
  },
  periodButtonTextSelected: {
    color: '#FFFFFF',
  },
  summaryContainer: {
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
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5B934E',
  },
  efficiencyContainer: {
    padding: 20,
  },
  efficiencyLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#467933',
    marginBottom: 10,
  },
  efficiencyCard: {
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
  efficiencyRating: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  efficiencyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  chartContainer: {
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
  chartHeader: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B934E',
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  chartArea: {
    height: 200,
    justifyContent: 'flex-end',
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    width: 20,
    backgroundColor: '#5B934E',
    borderRadius: 10,
    marginBottom: 5,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  analysisContainer: {
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
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B934E',
    marginBottom: 10,
  },
  analysisText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  recommendationsContainer: {
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
  recommendationsTitle: {
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
  recommendationBullet: {
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

export default AnalyticsScreen;

