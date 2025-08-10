import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { ChartData, TimePeriod } from '../managers/AnalyticsDataManager';
import { AnalyticsCalculator } from '../utils/AnalyticsCalculator';

interface EnergyConsumptionChartProps {
  chartData: ChartData;
  selectedPeriod: TimePeriod;
}

const EnergyConsumptionChart: React.FC<EnergyConsumptionChartProps> = ({
  chartData,
  selectedPeriod,
}) => {
  const { labels, data, average } = chartData;
  const screenWidth = Dimensions.get('window').width;
  const maxValue = Math.max(...data);
  const chartWidth = Math.max(screenWidth - 40, labels.length * 35); // Ensure minimum spacing

  const renderChart = () => {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.chartScrollView}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      >
        <View style={[styles.chartBars, { width: chartWidth }]}>
          {data.map((value, index) => {
            const barHeight = (value / maxValue) * 150;
            const barColor = AnalyticsCalculator.getBarColor(value, average);
            
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <Text style={styles.barValue}>
                    {AnalyticsCalculator.formatConsumptionValue(value, selectedPeriod)}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {labels[index]}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const getChartTitle = () => {
    switch (selectedPeriod) {
      case 'Realtime':
        return 'Real-time Power Consumption';
      case 'Daily':
        return 'Hourly Energy Consumption';
      case 'Weekly':
        return 'Daily Energy Consumption';
      case 'Monthly':
        return 'Daily Energy Consumption (Monthly View)';
      default:
        return 'Energy Consumption';
    }
  };

  const getChartSubtitle = () => {
    switch (selectedPeriod) {
      case 'Realtime':
        return 'Last 6 readings (10-second intervals)';
      case 'Daily':
        return 'Last 24 hours';
      case 'Weekly':
        return 'Last 7 days';
      case 'Monthly':
        return 'Last 30 days';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getChartTitle()}</Text>
        <Text style={styles.subtitle}>{getChartSubtitle()}</Text>
      </View>
      
      <View style={styles.chartArea}>
        {renderChart()}
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>High</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Above Avg</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#5B934E' }]} />
          <Text style={styles.legendText}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Low</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#2E7D32' }]} />
          <Text style={styles.legendText}>Very Low</Text>
        </View>
      </View>
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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B934E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  chartArea: {
    height: 200,
    justifyContent: 'flex-end',
  },
  chartScrollView: {
    flex: 1,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    minWidth: '100%',
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 1,
    minWidth: 30,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 150,
  },
  bar: {
    width: 12, // Thinner bars as requested
    backgroundColor: '#5B934E',
    borderRadius: 2, // Less rounded edges as requested
    marginBottom: 5,
    minHeight: 2,
  },
  barValue: {
    fontSize: 9,
    color: '#333',
    textAlign: 'center',
    marginBottom: 3,
    fontWeight: '500',
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 35,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 2,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#666',
  },
});

export default EnergyConsumptionChart;
