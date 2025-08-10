import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { AnalyticsDataManager, TimePeriod, ChartData, HistoryData } from './managers/AnalyticsDataManager';
import { SummaryCardData } from '../../services/analytics/EnergyCalculationService';
import { SensorReadingModel } from '../../models/SensorReading';
import TimePeriodSelector from './components/TimePeriodSelector';
import SummaryCards from './components/SummaryCards';
import EfficiencyRating from './components/EfficiencyRating';
import EnergyConsumptionChart from './components/EnergyConsumptionChart';
import AnalysisSection from './components/AnalysisSection';
import RecommendationsSection from './components/RecommendationsSection';
import HistoryTable from './components/HistoryTable';

const AnalyticsScreenRefactored: React.FC = () => {
  const [sensors, setSensors] = useState<{ [key: string]: SensorReadingModel }>({});
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    data: [],
    total: 0,
    average: 0,
    peak: 0,
    low: 0,
  });
  const [summaryCardData, setSummaryCardData] = useState<SummaryCardData>({
    totalValue: 0,
    totalLabel: 'Total',
    avgValue: 0,
    avgLabel: 'Average',
    peakValue: 0,
    peakLabel: 'Peak',
    peakDetail: ''
  });
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Realtime');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | null>(null);

  // Initialize data manager
  const dataManager = new AnalyticsDataManager(
    setSensors,
    setChartData,
    setSummaryCardData,
    setSelectedPeriod,
    setLoading,
    setRefreshing,
    setHistoryData,
    setSelectedHistoryDate
  );

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initializeData = async () => {
      try {
        cleanup = await dataManager.initialize();
      } catch (error) {
        console.error('Error initializing analytics data:', error);
        setLoading(false);
      }
    };

    initializeData();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const handlePeriodChange = async (period: TimePeriod) => {
    setSelectedPeriod(period);
    await Promise.all([
      dataManager.generateChartData(period, sensors),
      dataManager.generateSummaryCardData(period)
    ]);
  };

  const handleRefresh = async () => {
    await dataManager.refresh();
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedHistoryDate(date);
    await dataManager.generateHistoryData(date, sensors);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#5B934E']}
            tintColor="#5B934E"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Time Period Selector */}
        <TimePeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
        />

        {/* Summary Cards */}
        <SummaryCards
          summaryCardData={summaryCardData}
          selectedPeriod={selectedPeriod}
        />

        {/* Efficiency Rating */}
        <EfficiencyRating chartData={chartData} />

        {/* Energy Consumption Chart */}
        <EnergyConsumptionChart
          chartData={chartData}
          selectedPeriod={selectedPeriod}
        />

        {/* Analysis Section */}
        <AnalysisSection
          chartData={chartData}
          selectedPeriod={selectedPeriod}
          sensors={sensors}
        />

        {/* Recommendations Section */}
        <RecommendationsSection
          chartData={chartData}
          selectedPeriod={selectedPeriod}
          sensors={sensors}
        />

        {/* History Table */}
        <HistoryTable
          historyData={historyData}
          selectedDate={selectedHistoryDate}
          onDateSelect={handleDateSelect}
          sensors={sensors}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 16,
    color: '#5B934E',
    fontWeight: '500',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5B934E',
  },
  scrollView: {
    flex: 1,
  },
});

export default AnalyticsScreenRefactored;
