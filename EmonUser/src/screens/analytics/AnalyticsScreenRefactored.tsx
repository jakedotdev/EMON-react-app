import React, { useState, useEffect, useCallback, useRef } from 'react';
import { backgroundService } from '../../services/BackgroundService';
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
import SummaryCards from './components/SummaryCardsImpl';
import EnergyConsumptionChart from './components/EnergyConsumptionChart';
import AnalysisSection from './components/AnalysisSection';
import RecommendationsSection from './components/RecommendationsSection';
import HistoryTable from './components/HistoryTableImpl';
import AnalyticsDatePicker from './components/AnalyticsDatePicker';
import WeeklyRangePicker from './components/WeeklyRangePicker';
import MonthPicker from './components/MonthPicker';
import { authService } from '../../services/auth/authService';
import { historicalDataStoreService } from '../../services/analytics/HistoricalDataStoreService';

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
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | null>(null);
  const seededOnceRef = useRef(false);

  // Background service is initialized globally in App.tsx

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
    setChartLoading(true);
    try {
      await Promise.all([
        dataManager.generateChartData(period, sensors, selectedHistoryDate || undefined),
        dataManager.generateSummaryCardData(period, selectedHistoryDate || undefined)
      ]);
    } finally {
      setChartLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    await Promise.all([
      dataManager.generateChartData(selectedPeriod, sensors, selectedHistoryDate || undefined),
      dataManager.generateSummaryCardData(selectedPeriod, selectedHistoryDate || undefined)
    ]);
  }, [selectedPeriod, sensors, selectedHistoryDate, dataManager]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    (async () => {
      try {
        // One-time seeding of today's missing hourly docs to enable realtime Avg/Peak testing
        if (!seededOnceRef.current) {
          const user = authService.getCurrentUser();
          if (user) {
            try {
              const result = await historicalDataStoreService.backfillTodayHourlyProvisionalRandom(
                user.uid,
                sensors
              );
              console.log('Backfill today hourly provisional result:', result);
            } catch (e) {
              console.warn('Backfill seeding failed (continuing):', e);
            }
            seededOnceRef.current = true;
          }
        }

        // Force a fresh data capture and reload
        await backgroundService.captureHistoricalData();
        await loadData();
      } catch (err) {
        console.error(err);
      } finally {
        setRefreshing(false);
      }
    })();
  }, [loadData, sensors]);

  const handleDateSelect = async (date: Date) => {
    setSelectedHistoryDate(date);
    // Always refresh history for picked date (used by HistoryTable)
    await dataManager.generateHistoryData(date, sensors);
    // Regenerate chart and summary for the active period (excluding Realtime)
    if (selectedPeriod !== 'Realtime') {
      setChartLoading(true);
      try {
        await Promise.all([
          dataManager.generateChartData(selectedPeriod, sensors, date),
          dataManager.generateSummaryCardData(selectedPeriod, date),
        ]);
      } finally {
        setChartLoading(false);
      }
    }
  };

  const handleWeekSelect = async (anyDateInWeek: Date) => {
    // Auto-snap already performed in WeeklyRangePicker; we pass the date to manager
    setSelectedHistoryDate(anyDateInWeek);
    setChartLoading(true);
    try {
      await Promise.all([
        dataManager.generateChartData('Weekly', sensors, anyDateInWeek),
        dataManager.generateSummaryCardData('Weekly', anyDateInWeek),
      ]);
    } finally {
      setChartLoading(false);
    }
  };

  const handleMonthSelect = async (firstDayOfMonth: Date) => {
    setSelectedHistoryDate(firstDayOfMonth);
    setChartLoading(true);
    try {
      await Promise.all([
        dataManager.generateChartData('Monthly', sensors, firstDayOfMonth),
        dataManager.generateSummaryCardData('Monthly', firstDayOfMonth),
      ]);
    } finally {
      setChartLoading(false);
    }
  };

  // Removed monthly mock seeding handlers and UI buttons

  // Helpers for chart subtitle
  const getISOWeek = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Thursday in current week decides the year.
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
  };

  const subtitleForPeriod = (): string => {
    const refDate = selectedHistoryDate || new Date();
    switch (selectedPeriod) {
      case 'Realtime':
        return 'Live power usage (kW)';
      case 'Daily': {
        return 'Energy usage by hours (selected day)';
      }
      case 'Weekly': {
        const { year, week } = getISOWeek(refDate);
        return `Energy usage for days (${year}-W${String(week).padStart(2, '0')})`;
      }
      case 'Monthly': {
        const y = refDate.getFullYear();
        const m = String(refDate.getMonth() + 1).padStart(2, '0');
        return `Energy usage for weeks (${y}-${m})`;
      }
      default:
        return 'Energy usage';
    }
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
        {/* Mock data seeding buttons removed */}

        {/* Time Period Selector */}
        <TimePeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
        />

        {/* Period-specific pickers */}
        {selectedPeriod === 'Daily' && (
          <AnalyticsDatePicker
            selectedDate={selectedHistoryDate}
            onSelect={handleDateSelect}
          />
        )}
        {selectedPeriod === 'Weekly' && (
          <WeeklyRangePicker
            initialDate={selectedHistoryDate}
            onWeekSelect={handleWeekSelect}
          />
        )}
        {selectedPeriod === 'Monthly' && (
          <MonthPicker
            initialDate={selectedHistoryDate}
            restrictToCurrentYear={true}
            onMonthSelect={handleMonthSelect}
          />
        )}

        {/* Summary Cards */}
        <SummaryCards
          summaryCardData={summaryCardData}
          selectedPeriod={selectedPeriod}
        />

        {/* Energy Consumption Chart */}
        <EnergyConsumptionChart
          chartData={chartData}
          selectedPeriod={selectedPeriod}
          isLoading={refreshing || chartLoading}
          subtitle={subtitleForPeriod()}
          onRefresh={handleRefresh}
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
