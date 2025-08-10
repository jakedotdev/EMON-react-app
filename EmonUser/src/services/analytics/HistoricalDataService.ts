import { ref, get, query, orderByKey, limitToLast } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import { SensorReadingModel } from '../../models/SensorReading';

export interface HistoricalDataPoint {
  timestamp: number;
  power: number;
  voltage: number;
  current: number;
  energy: number;
  dailyEnergy?: number;
  applianceState: boolean;
  sensorId: string;
}

export interface AggregatedData {
  timestamp: number;
  totalPower: number;
  totalEnergy: number;
  averagePower: number;
  peakPower: number;
  lowPower: number;
  activeSensors: number;
}

export class HistoricalDataService {
  
  /**
   * Get historical sensor readings for a specific time range
   */
  async getHistoricalData(
    startTime: Date,
    endTime: Date,
    sensorIds?: string[]
  ): Promise<HistoricalDataPoint[]> {
    try {
      const historicalData: HistoricalDataPoint[] = [];
      
      // For now, we'll simulate historical data based on current sensor values
      // In a real implementation, you'd have a separate historical data collection
      const currentSensors = await this.getCurrentSensorData();
      
      // Generate historical points based on current sensor data
      const timeRange = endTime.getTime() - startTime.getTime();
      const intervals = Math.min(100, Math.max(10, Math.floor(timeRange / (1000 * 60 * 60)))); // Max 100 points
      
      for (let i = 0; i < intervals; i++) {
        const timestamp = startTime.getTime() + (timeRange / intervals) * i;
        
        Object.entries(currentSensors).forEach(([sensorKey, sensor]) => {
          // Use actual sensor values with realistic historical variation
          const baseVariation = this.getHistoricalVariation(new Date(timestamp));
          
          historicalData.push({
            timestamp,
            power: Math.max(0, sensor.power * baseVariation),
            voltage: sensor.voltage * (0.95 + Math.random() * 0.1), // ±5% voltage variation
            current: Math.max(0, sensor.current * baseVariation),
            energy: sensor.energy + (i * sensor.power / 1000), // Cumulative energy
            dailyEnergy: sensor.dailyEnergy,
            applianceState: Math.random() > 0.3, // 70% chance appliance is on
            sensorId: sensorKey
          });
        });
      }
      
      return historicalData.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error getting historical data:', error);
      return [];
    }
  }

  /**
   * Get aggregated data for analytics charts
   */
  async getAggregatedData(
    startTime: Date,
    endTime: Date,
    intervalMinutes: number = 60
  ): Promise<AggregatedData[]> {
    try {
      const historicalData = await this.getHistoricalData(startTime, endTime);
      const aggregatedData: AggregatedData[] = [];
      
      // Group data by time intervals
      const intervalMs = intervalMinutes * 60 * 1000;
      const startTimestamp = Math.floor(startTime.getTime() / intervalMs) * intervalMs;
      const endTimestamp = Math.floor(endTime.getTime() / intervalMs) * intervalMs;
      
      for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += intervalMs) {
        const intervalData = historicalData.filter(
          point => point.timestamp >= timestamp && point.timestamp < timestamp + intervalMs
        );
        
        if (intervalData.length > 0) {
          const powers = intervalData.map(d => d.power);
          const totalPower = powers.reduce((sum, power) => sum + power, 0);
          const averagePower = totalPower / powers.length;
          const peakPower = Math.max(...powers);
          const lowPower = Math.min(...powers);
          const activeSensors = new Set(intervalData.map(d => d.sensorId)).size;
          
          aggregatedData.push({
            timestamp,
            totalPower,
            totalEnergy: intervalData.reduce((sum, d) => sum + (d.energy || 0), 0) / intervalData.length,
            averagePower,
            peakPower,
            lowPower,
            activeSensors
          });
        }
      }
      
      return aggregatedData;
    } catch (error) {
      console.error('Error getting aggregated data:', error);
      return [];
    }
  }

  /**
   * Get real-time data for the last N minutes
   */
  async getRealtimeData(minutes: number = 10): Promise<HistoricalDataPoint[]> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - minutes * 60 * 1000);
    
    return this.getHistoricalData(startTime, endTime);
  }

  /**
   * Get daily energy consumption for a specific date
   */
  async getDailyConsumption(date: Date): Promise<{ hourly: AggregatedData[]; total: number }> {
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);
    
    const hourlyData = await this.getAggregatedData(startTime, endTime, 60); // 1-hour intervals
    const total = hourlyData.reduce((sum, data) => sum + data.totalPower, 0);
    
    return { hourly: hourlyData, total };
  }

  /**
   * Get current sensor data from Firebase
   */
  private async getCurrentSensorData(): Promise<{ [key: string]: SensorReadingModel }> {
    try {
      const sensorsRef = ref(database, '/');
      const snapshot = await get(sensorsRef);
      const sensors: { [key: string]: SensorReadingModel } = {};
      
      snapshot.forEach((childSnapshot) => {
        const sensorId = childSnapshot.key;
        if (sensorId && (sensorId === 'SensorReadings' || sensorId.startsWith('SensorReadings_'))) {
          const mappedId = sensorId === 'SensorReadings' ? 'SensorReadings_1' : sensorId;
          const data = childSnapshot.val();
          sensors[mappedId] = new SensorReadingModel(data);
        }
      });
      
      return sensors;
    } catch (error) {
      console.error('Error getting current sensor data:', error);
      return {};
    }
  }

  /**
   * Generate realistic historical variation based on time patterns
   */
  private getHistoricalVariation(date: Date): number {
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    // Base variation for time of day (realistic usage patterns)
    let timeVariation = 1.0;
    if (hour >= 6 && hour <= 9) timeVariation = 1.2; // Morning peak
    else if (hour >= 10 && hour <= 16) timeVariation = 0.8; // Daytime low
    else if (hour >= 17 && hour <= 21) timeVariation = 1.4; // Evening peak
    else if (hour >= 22 || hour <= 5) timeVariation = 0.6; // Night low
    
    // Weekend variation (typically higher home usage)
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.1 : 1.0;
    
    // Add some random variation (±15%)
    const randomVariation = 0.85 + Math.random() * 0.3;
    
    return timeVariation * weekendMultiplier * randomVariation;
  }

  /**
   * Calculate energy cost based on consumption
   */
  calculateEnergyCost(energyKWh: number, ratePerKWh: number = 0.12): number {
    return energyKWh * ratePerKWh;
  }

  /**
   * Get efficiency rating based on consumption patterns
   */
  calculateEfficiencyRating(data: AggregatedData[]): string {
    if (data.length === 0) return 'N/A';
    
    const averages = data.map(d => d.averagePower);
    const peaks = data.map(d => d.peakPower);
    
    const avgConsumption = averages.reduce((sum, val) => sum + val, 0) / averages.length;
    const avgPeak = peaks.reduce((sum, val) => sum + val, 0) / peaks.length;
    
    const variability = avgPeak / avgConsumption;
    
    if (variability <= 1.5 && avgConsumption <= 100) return 'Excellent';
    if (variability <= 2.0 && avgConsumption <= 150) return 'Good';
    if (variability <= 2.5 && avgConsumption <= 200) return 'Fair';
    return 'Poor';
  }
}

export const historicalDataService = new HistoricalDataService();
