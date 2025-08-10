import { Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import { sensorService } from '../../../services/sensors/sensorService';
import { SensorReadingModel } from '../../../models/SensorReading';
import { historicalDataService, HistoricalDataPoint, AggregatedData } from '../../../services/analytics/HistoricalDataService';
import { historicalDataStoreService } from '../../../services/analytics/HistoricalDataStoreService';
import { energyCalculationService, SummaryCardData } from '../../../services/analytics/EnergyCalculationService';

export type TimePeriod = 'Realtime' | 'Daily' | 'Weekly' | 'Monthly';

export interface ChartData {
  labels: string[];
  data: number[];
  total: number;
  average: number;
  peak: number;
  low: number;
}

export interface HistoryData {
  date: string;
  time: string;
  consumption: number;
  cost: number;
  efficiency: string;
}

export interface AnalyticsData {
  sensors: { [key: string]: SensorReadingModel };
  chartData: ChartData;
  summaryCardData: SummaryCardData;
  selectedPeriod: TimePeriod;
  loading: boolean;
  refreshing: boolean;
  historyData: HistoryData[];
  selectedHistoryDate: Date | null;
}

export class AnalyticsDataManager {
  private setSensors: (sensors: { [key: string]: SensorReadingModel }) => void;
  private setChartData: (data: ChartData) => void;
  private setSummaryCardData: (data: SummaryCardData) => void;
  private setSelectedPeriod: (period: TimePeriod) => void;
  private setLoading: (loading: boolean) => void;
  private setRefreshing: (refreshing: boolean) => void;
  private setHistoryData: (data: HistoryData[]) => void;
  private setSelectedHistoryDate: (date: Date | null) => void;

  constructor(
    setSensors: (sensors: { [key: string]: SensorReadingModel }) => void,
    setChartData: (data: ChartData) => void,
    setSummaryCardData: (data: SummaryCardData) => void,
    setSelectedPeriod: (period: TimePeriod) => void,
    setLoading: (loading: boolean) => void,
    setRefreshing: (refreshing: boolean) => void,
    setHistoryData: (data: HistoryData[]) => void,
    setSelectedHistoryDate: (date: Date | null) => void
  ) {
    this.setSensors = setSensors;
    this.setChartData = setChartData;
    this.setSummaryCardData = setSummaryCardData;
    this.setSelectedPeriod = setSelectedPeriod;
    this.setLoading = setLoading;
    this.setRefreshing = setRefreshing;
    this.setHistoryData = setHistoryData;
    this.setSelectedHistoryDate = setSelectedHistoryDate;
  }

  async initialize(): Promise<() => void> {
    this.setLoading(true);
    
    const sensorUnsubscribe = await this.loadSensorData();
    
    return () => {
      sensorUnsubscribe();
    };
  }

  async loadSensorData(): Promise<() => void> {
    const unsubscribe = sensorService.listenToAllSensors((sensorData) => {
      this.setSensors(sensorData);
      // Persist historical deltas based on user's preferred timezone
      const uid = getAuth().currentUser?.uid;
      if (uid) {
        // Fire and forget; errors logged inside service if thrown up the stack
        void historicalDataStoreService.capturePeriodics(uid, sensorData);
      }
      this.generateChartData('Realtime', sensorData);
      // Also generate summary card data for initial load
      this.generateSummaryCardData('Realtime');
      this.setLoading(false);
    });

    return unsubscribe;
  }

  async generateSummaryCardData(period: TimePeriod) {
    try {
      let summaryData: SummaryCardData;
      
      switch (period) {
        case 'Realtime':
          summaryData = await energyCalculationService.getRealtimeSummary();
          break;
        case 'Daily':
          summaryData = await energyCalculationService.getDailySummary();
          break;
        case 'Weekly':
          summaryData = await energyCalculationService.getWeeklySummary();
          break;
        case 'Monthly':
          summaryData = await energyCalculationService.getMonthlySummary();
          break;
        default:
          summaryData = await energyCalculationService.getRealtimeSummary();
      }
      
      this.setSummaryCardData(summaryData);
    } catch (error) {
      console.error('Error generating summary card data:', error);
      // Set empty summary data as fallback
      this.setSummaryCardData({
        totalValue: 0,
        totalLabel: 'Total',
        avgValue: 0,
        avgLabel: 'Average',
        peakValue: 0,
        peakLabel: 'Peak',
        peakDetail: ''
      });
    }
  }

  async generateChartData(period: TimePeriod, sensors: { [key: string]: SensorReadingModel }) {
    try {
      let labels: string[] = [];
      let data: number[] = [];
      let aggregatedData: AggregatedData[] = [];

      const now = new Date();
      let startTime: Date;
      let endTime: Date = now;

      switch (period) {
        case 'Realtime':
          // Last 10 minutes of real data
          startTime = new Date(now.getTime() - 10 * 60 * 1000);
          const realtimeData = await historicalDataService.getRealtimeData(10);
          
          // Group by 2-minute intervals for 6 data points
          const intervalMs = 2 * 60 * 1000;
          for (let i = 5; i >= 0; i--) {
            const intervalStart = new Date(now.getTime() - i * intervalMs);
            const intervalEnd = new Date(intervalStart.getTime() + intervalMs);
            
            const intervalData = realtimeData.filter(point => 
              point.timestamp >= intervalStart.getTime() && point.timestamp < intervalEnd.getTime()
            );
            
            const avgEnergy = intervalData.length > 0 
              ? intervalData.reduce((sum, point) => sum + (point.energy || 0), 0) / intervalData.length
              : 0;
            
            labels.push(`${intervalStart.getMinutes()}:${intervalStart.getSeconds().toString().padStart(2, '0')}`);
            data.push(avgEnergy); // Using energy in kWh
          }
          break;

        case 'Daily':
          // Last 24 hours of real data
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          aggregatedData = await historicalDataService.getAggregatedData(startTime, endTime, 60); // 1-hour intervals
          
          for (let i = 23; i >= 0; i--) {
            const hour = (24 + (now.getHours() - i)) % 24;
            labels.push(`${hour}:00`);
            
            const hourData = aggregatedData.find(d => {
              const dataHour = new Date(d.timestamp).getHours();
              return dataHour === hour;
            });
            
            data.push(hourData ? hourData.totalEnergy : 0); // Using totalEnergy in kWh
          }
          break;

        case 'Weekly':
          // Last 7 days of real data
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          aggregatedData = await historicalDataService.getAggregatedData(startTime, endTime, 24 * 60); // Daily intervals
          
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          labels = days;
          
          for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dayStart.setHours(0, 0, 0, 0);
            
            const dayData = aggregatedData.find(d => {
              const dataDay = new Date(d.timestamp);
              dataDay.setHours(0, 0, 0, 0);
              return dataDay.getTime() === dayStart.getTime();
            });
            
            data.push(dayData ? dayData.totalEnergy : 0); // Using totalEnergy in kWh
          }
          break;

        case 'Monthly':
          // Last 30 days of real data
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          aggregatedData = await historicalDataService.getAggregatedData(startTime, endTime, 24 * 60); // Daily intervals
          
          for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
            
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            
            const dayData = aggregatedData.find(d => {
              const dataDay = new Date(d.timestamp);
              dataDay.setHours(0, 0, 0, 0);
              return dataDay.getTime() === dayStart.getTime();
            });
            
            data.push(dayData ? dayData.totalEnergy : 0); // Using totalEnergy in kWh
          }
          break;
      }

      const total = data.reduce((sum, value) => sum + value, 0);
      const average = total / data.length;
      const peak = Math.max(...data);
      const low = Math.min(...data);

      const chartData: ChartData = { labels, data, total, average, peak, low };
      this.setChartData(chartData);
      this.setSelectedPeriod(period);
    } catch (error) {
      console.error('Error generating chart data:', error);
      // Fallback to current sensor data if historical data fails
      this.generateFallbackChartData(period, sensors);
    }
  }

  private generateFallbackChartData(period: TimePeriod, sensors: { [key: string]: SensorReadingModel }) {
    // Fallback method using current sensor data when historical data is unavailable
    let labels: string[] = [];
    let data: number[] = [];
    
    const sensorValues = Object.values(sensors);
    const currentEnergy = sensorValues.reduce((sum, sensor) => {
      return sum + (sensor.energy || 0); // Use energy in kWh
    }, 0);
    
    const now = new Date();
    
    switch (period) {
      case 'Realtime':
        for (let i = 5; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 2 * 60 * 1000); // 2-minute intervals
          labels.push(`${time.getMinutes()}:${time.getSeconds().toString().padStart(2, '0')}`);
          data.push(currentEnergy); // Use actual current energy
        }
        break;
        
      case 'Daily':
        for (let i = 23; i >= 0; i--) {
          const hour = (24 + (now.getHours() - i)) % 24;
          labels.push(`${hour}:00`);
          data.push(currentEnergy); // Use actual current energy
        }
        break;
        
      case 'Weekly':
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        labels = days;
        data = Array.from({ length: 7 }, () => currentEnergy); // Daily energy totals
        break;
        
      case 'Monthly':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
          data.push(currentEnergy); // Daily energy totals
        }
        break;
    }
    
    const total = data.reduce((sum, value) => sum + value, 0);
    const average = total / data.length;
    const peak = Math.max(...data);
    const low = Math.min(...data);
    
    const chartData: ChartData = { labels, data, total, average, peak, low };
    this.setChartData(chartData);
    this.setSelectedPeriod(period);
  }

  async generateHistoryData(selectedDate: Date, sensors: { [key: string]: SensorReadingModel }): Promise<HistoryData[]> {
    try {
      const { hourly } = await historicalDataService.getDailyConsumption(selectedDate);
      const historyData: HistoryData[] = [];
      
      // Generate hourly data based on real historical data
      for (let hour = 0; hour < 24; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        
        // Find corresponding hourly data
        const hourData = hourly.find(data => {
          const dataHour = new Date(data.timestamp).getHours();
          return dataHour === hour;
        });
        
        const energyKWh = hourData ? hourData.totalEnergy : 0; // Use totalEnergy directly
        const cost = historicalDataService.calculateEnergyCost(energyKWh);
        
        // Calculate efficiency based on real energy consumption patterns
        let efficiency = 'Good';
        if (hourly.length > 0) {
          const avgEnergy = hourly.reduce((sum, d) => sum + d.totalEnergy, 0) / hourly.length;
          if (energyKWh > avgEnergy * 1.3) efficiency = 'Poor';
          else if (energyKWh > avgEnergy * 1.1) efficiency = 'Fair';
          else if (energyKWh < avgEnergy * 0.8) efficiency = 'Excellent';
        }

        historyData.push({
          date: selectedDate.toLocaleDateString(),
          time,
          consumption: Math.round(energyKWh * 1000), // Convert back to Wh for display
          cost: parseFloat(cost.toFixed(3)),
          efficiency
        });
      }

      this.setHistoryData(historyData);
      return historyData;
    } catch (error) {
      console.error('Error generating history data:', error);
      // Fallback to current sensor data
      return this.generateFallbackHistoryData(selectedDate, sensors);
    }
  }
  
  private generateFallbackHistoryData(selectedDate: Date, sensors: { [key: string]: SensorReadingModel }): HistoryData[] {
    const historyData: HistoryData[] = [];
    const currentEnergy = Object.values(sensors).reduce((sum, sensor) => {
      return sum + (sensor.energy || 0); // Use energy in kWh
    }, 0);

    // Generate hourly data using current sensor energy readings
    for (let hour = 0; hour < 24; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      const energyKWh = currentEnergy; // Use actual current energy
      const cost = historicalDataService.calculateEnergyCost(energyKWh);
      
      historyData.push({
        date: selectedDate.toLocaleDateString(),
        time,
        consumption: Math.round(energyKWh * 1000), // Convert to Wh for display
        cost: parseFloat(cost.toFixed(3)),
        efficiency: 'Good'
      });
    }

    this.setHistoryData(historyData);
    return historyData;
  }

  async refresh(): Promise<void> {
    this.setRefreshing(true);
    
    try {
      const sensorData = await sensorService.getAllSensorData();
      this.setSensors(sensorData);
      // Persist historical deltas on manual refresh as well
      const uid = getAuth().currentUser?.uid;
      if (uid) {
        void historicalDataStoreService.capturePeriodics(uid, sensorData);
      }
      
      // Regenerate chart data with fresh sensor data
      const currentPeriod = 'Realtime'; // You might want to track current period
      this.generateChartData(currentPeriod, sensorData);
      // Regenerate summary card data as well
      this.generateSummaryCardData(currentPeriod);
      
    } catch (err) {
      console.error('Error refreshing analytics data:', err);
      Alert.alert('Error', 'Failed to refresh analytics data');
    } finally {
      this.setRefreshing(false);
    }
  }

  async updateSelectedHistoryDate(date: Date, sensors: { [key: string]: SensorReadingModel }) {
    this.setSelectedHistoryDate(date);
    await this.generateHistoryData(date, sensors);
  }
}
