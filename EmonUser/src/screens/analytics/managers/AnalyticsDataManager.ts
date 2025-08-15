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
  // Keep latest sensors and uid for periodic persistence while app is open
  private lastSensors: { [key: string]: SensorReadingModel } | null = null;
  private lastUid: string | undefined;
  private boundaryTimer: any = null;
  private didBackfillToday: boolean = false;

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
    
    // Start a lightweight boundary timer (every ~60s) to persist aggregates client-side
    // This replaces server-side scheduled functions while on free tier.
    if (!this.boundaryTimer) {
      this.boundaryTimer = setInterval(() => {
        try {
          const uid = this.lastUid ?? getAuth().currentUser?.uid;
          if (uid && this.lastSensors) {
            void historicalDataStoreService.capturePeriodics(uid, this.lastSensors);
          }
        } catch (e) {
          // Non-fatal; keep UI responsive
          console.warn('boundaryTimer capturePeriodics error:', e);
        }
      }, 60_000);
    }
    
    return () => {
      sensorUnsubscribe();
      if (this.boundaryTimer) {
        clearInterval(this.boundaryTimer);
        this.boundaryTimer = null;
      }
    };
  }

  async loadSensorData(): Promise<() => void> {
    const unsubscribe = sensorService.listenToAllSensors((sensorData) => {
      this.setSensors(sensorData);
      this.lastSensors = sensorData;
      // Persist historical deltas based on user's preferred timezone
      const uid = getAuth().currentUser?.uid;
      if (uid) {
        this.lastUid = uid;
        // Fire and forget; errors logged inside service if thrown up the stack
        void historicalDataStoreService.capturePeriodics(uid, sensorData);
        // Also try to backfill any missing daily docs up to yesterday
        void historicalDataStoreService.backfillMissingDaily(uid);
        // One-time attempt to backfill today's missing hourly docs with provisional series
        if (!this.didBackfillToday) {
          this.didBackfillToday = true;
          void historicalDataStoreService.backfillTodayHourlyProvisionalRandom(uid, sensorData);
        }
      }
      this.generateChartData('Realtime', sensorData);
      // Also generate summary card data for initial load
      this.generateSummaryCardData('Realtime');
      this.setLoading(false);
    });

    return unsubscribe;
  }

  async generateSummaryCardData(period: TimePeriod, selectedDate?: Date) {
    try {
      let summaryData: SummaryCardData;
      
      switch (period) {
        case 'Realtime':
          summaryData = await energyCalculationService.getRealtimeSummary();
          break;
        case 'Daily':
          summaryData = await energyCalculationService.getDailySummary(selectedDate);
          break;
        case 'Weekly':
          summaryData = await energyCalculationService.getWeeklySummary(selectedDate);
          break;
        case 'Monthly':
          summaryData = await energyCalculationService.getMonthlySummary(selectedDate);
          break;
        default:
          summaryData = await energyCalculationService.getRealtimeSummary();
      }
      
      this.setSummaryCardData(summaryData);
    } catch (error) {
      console.error('Error generating summary card data:', error);
      // Avoid buffering with placeholder zeros; keep previous summary values
    }
  }

  async generateChartData(period: TimePeriod, sensors: { [key: string]: SensorReadingModel }, selectedDate?: Date) {
    try {
      let labels: string[] = [];
      let data: number[] = [];
      let aggregatedData: AggregatedData[] = [];

      const now = new Date();
      let startTime: Date;
      let endTime: Date = now;

      switch (period) {
        case 'Realtime':
          // Current hour split into 6 buckets: every 10 minutes (hh:10, ..., nextHour 00)
          // Future bucket (not yet reached) should display 0
          {
            // Fetch last 60 minutes of realtime points (fallback source)
            const realtimeData = await historicalDataService.getRealtimeData(60);

            // Resolve user's preferred timezone
            const uid = getAuth().currentUser?.uid;
            const tz = uid ? await energyCalculationService.getUserTimezone(uid) : 'UTC';

            // Compute the epoch for the start of the current hour in user's timezone
            const nowActual = new Date();
            const parts = new Intl.DateTimeFormat('en-CA', {
              timeZone: tz,
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', hour12: false,
            }).formatToParts(nowActual);
            const getNum = (t: string) => Number(parts.find(p => p.type === t)?.value);
            const y = getNum('year');
            const mo = getNum('month');
            const d = getNum('day');
            const hr = getNum('hour');
            const min = getNum('minute');
            // Local-as-UTC instant representing the user's current wall time
            const localAsUTC = Date.UTC(y, mo - 1, d, hr, min, 0, 0);
            // Offset between that and actual now gives tz offset at this instant
            const tzOffsetMs = localAsUTC - nowActual.getTime();
            // Start of hour in user's local time, converted to actual epoch
            const hourStartEpoch = Date.UTC(y, mo - 1, d, hr, 0, 0, 0) - tzOffsetMs;

            // Try to get Firestore buckets for current hour
            const buckets = uid ? await historicalDataService.getCurrentHourBuckets(uid, tz) : undefined;

            // Formatter for labels in user's timezone, 12-hour with AM/PM (e.g., 9:10 PM)
            const fmt = new Intl.DateTimeFormat('en-US', {
              timeZone: tz,
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            for (let i = 1; i <= 6; i++) {
              const minutesMark = i * 10; // 10,20,30,40,50,60
              const bucketEndMs = hourStartEpoch + minutesMark * 60 * 1000;
              const bucketStartMs = bucketEndMs - 10 * 60 * 1000;
              const bucketEnd = new Date(bucketEndMs);

              // Label end-of-bucket time in user's timezone; for 60, show next hour 00
              const labelDate = minutesMark === 60
                ? new Date(hourStartEpoch + 60 * 60 * 1000)
                : bucketEnd;
              labels.push(fmt.format(labelDate));

              // If bucketEnd is in the future relative to timezone-adjusted now, push 0
              if (bucketEndMs > nowActual.getTime()) {
                data.push(0);
                continue;
              }

              if (buckets) {
                const v = buckets[`b${i}`] ?? 0;
                data.push(typeof v === 'number' ? v : 0);
              } else {
                // Fallback: compute average from realtime points in this window
                const intervalData = realtimeData.filter(
                  (p) => p.timestamp >= bucketStartMs && p.timestamp < bucketEndMs
                );
                const avgEnergy = intervalData.length > 0
                  ? intervalData.reduce((sum, p) => sum + (p.energy || 0), 0) / intervalData.length
                  : 0;
                data.push(avgEnergy);
              }
            }
          }
          break;

        case 'Daily':
          // Selected date's 24 hours; if none selected, default to yesterday
          const target = selectedDate ? new Date(selectedDate) : (() => { const d = new Date(now); d.setDate(now.getDate() - 1); return d; })();
          startTime = new Date(target);
          startTime.setHours(0, 0, 0, 0);
          endTime = new Date(target);
          endTime.setHours(23, 59, 59, 999);
          // Read from Firestore hourly path: users/{uid}/historical/root/hourly/{YYYY-MM-DD}/hours
          {
            const uid = getAuth().currentUser?.uid;
            if (uid) {
              aggregatedData = await historicalDataService.getDailyAggregatedFromFirestore(startTime, uid);
            } else {
              aggregatedData = await historicalDataService.getAggregatedData(startTime, endTime, 60);
            }
          }

          for (let hour = 0; hour < 24; hour++) {
            labels.push(`${hour}:00`);
            const hourData = aggregatedData.find(d => new Date(d.timestamp).getHours() === hour);
            data.push(hourData ? hourData.totalEnergy : 0);
          }
          break;

        case 'Weekly':
          // Week containing selectedDate; else last 7 days from now
          {
            const uid = getAuth().currentUser?.uid;
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            labels = days;
            if (uid) {
              if (selectedDate) {
                // Compute Monday..Sunday of the week containing selectedDate (ISO week)
                const dateUTC = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate()));
                const dayOfWeek = (dateUTC.getUTCDay() || 7); // 1..7 where 1=Sun? JS: 0 Sun, so convert
                const monday = new Date(dateUTC);
                monday.setUTCDate(dateUTC.getUTCDate() - ((dayOfWeek === 7 ? 0 : dayOfWeek) - 1)); // make Monday
                for (let i = 0; i < 7; i++) {
                  const day = new Date(monday);
                  day.setUTCDate(monday.getUTCDate() + i);
                  const local = new Date(day);
                  local.setHours(0, 0, 0, 0);
                  const { total } = await historicalDataService.getDailyConsumption(local);
                  data.push(total);
                }
              } else {
                for (let i = 6; i >= 0; i--) {
                  const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                  day.setHours(0, 0, 0, 0);
                  const { total } = await historicalDataService.getDailyConsumption(day);
                  data.push(total);
                }
              }
            } else {
              // Fallback to previous local aggregation logic
              startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              aggregatedData = await historicalDataService.getAggregatedData(startTime, endTime, 24 * 60);
              for (let i = 6; i >= 0; i--) {
                const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                dayStart.setHours(0, 0, 0, 0);
                const dayData = aggregatedData.find(d => {
                  const dataDay = new Date(d.timestamp);
                  dataDay.setHours(0, 0, 0, 0);
                  return dataDay.getTime() === dayStart.getTime();
                });
                data.push(dayData ? dayData.totalEnergy : 0);
              }
            }
          }
          break;

        case 'Monthly':
          // Selected month grouped by ISO weeks: labels Wxx and values = weekly total (sum of daily totals)
          {
            const targetMonth = selectedDate ? new Date(selectedDate) : new Date(now);
            const year = targetMonth.getFullYear();
            const month = targetMonth.getMonth(); // 0-11

            // Compute date range covering the month
            const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
            const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

            // Helper to get ISO week number
            const getISOWeek = (d: Date) => {
              const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
              const dayNum = (date.getUTCDay() + 6) % 7; // 0=Mon
              date.setUTCDate(date.getUTCDate() - dayNum + 3);
              const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
              const diff = date.getTime() - firstThursday.getTime();
              return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
            };

            // Map week -> total
            const weekTotals = new Map<number, number>();

            // Iterate each day in month and accumulate daily totals per ISO week
            for (
              let dt = new Date(monthStart);
              dt.getTime() <= monthEnd.getTime();
              dt.setDate(dt.getDate() + 1)
            ) {
              const day = new Date(dt);
              day.setHours(0, 0, 0, 0);
              const { total } = await historicalDataService.getDailyConsumption(day);
              const week = getISOWeek(day);
              weekTotals.set(week, (weekTotals.get(week) || 0) + total);
            }

            // Sort week numbers and build labels/data e.g., W22, W23...
            const sortedWeeks = Array.from(weekTotals.keys()).sort((a, b) => a - b);
            labels = sortedWeeks.map((w) => `W${w}`);
            data = sortedWeeks.map((w) => weekTotals.get(w) || 0);
          }
          break;
      }

      const total = data.reduce((sum, value) => sum + value, 0);
      const average = total / data.length;
      const peak = Math.max(...data);
      const low = Math.min(...data);

      const chartData: ChartData = { labels, data, total, average, peak, low };
      this.setChartData(chartData);
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
      historyData.push({
        date: selectedDate.toLocaleDateString(),
        time,
        consumption: Math.round(energyKWh * 1000), // Convert to Wh for display
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
      this.lastSensors = sensorData;
      // Persist historical deltas on manual refresh as well
      const uid = getAuth().currentUser?.uid;
      if (uid) {
        this.lastUid = uid;
        void historicalDataStoreService.capturePeriodics(uid, sensorData);
        // Attempt daily backfill on manual refresh as well
        void historicalDataStoreService.backfillMissingDaily(uid);
        // Opportunistically backfill today's hourlies if still not done
        if (!this.didBackfillToday) {
          this.didBackfillToday = true;
          void historicalDataStoreService.backfillTodayHourlyProvisionalRandom(uid, sensorData);
        }
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
