import { sensorService } from '../sensors/sensorService';
import { SensorReadingModel } from '../../models/SensorReading';

export interface SummaryCardData {
  totalValue: number;
  totalLabel: string;
  avgValue: number;
  avgLabel: string;
  peakValue: number;
  peakLabel: string;
  peakDetail?: string; // For showing hour/day/week details
}

export class EnergyCalculationService {
  
  /**
   * Get realtime summary data
   */
  async getRealtimeSummary(): Promise<SummaryCardData> {
    try {
      const sensors = await sensorService.getAllSensorData();
      const onlineSensors = Object.values(sensors).filter(sensor => sensor.isOnline());
      
      // Total Energy: Sum of all online appliances' current energy
      const totalEnergy = onlineSensors.reduce((sum, sensor) => sum + (sensor.energy || 0), 0);
      
      // Average Energy: Average of all online appliances
      const avgEnergy = onlineSensors.length > 0 ? totalEnergy / onlineSensors.length : 0;
      
      // Peak Energy: Get highest energy reading from start of day until now
      const peakEnergy = await this.getPeakEnergyFromStartOfDay();
      
      return {
        totalValue: totalEnergy,
        totalLabel: 'Total Energy',
        avgValue: avgEnergy,
        avgLabel: 'Avg Energy',
        peakValue: peakEnergy.value,
        peakLabel: 'Peak Energy',
        peakDetail: `at ${peakEnergy.time}`
      };
    } catch (error) {
      console.error('Error getting realtime summary:', error);
      return this.getEmptySummary();
    }
  }
  
  /**
   * Get daily summary data (yesterday's consumption)
   */
  async getDailySummary(): Promise<SummaryCardData> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      
      const dayBeforeYesterday = new Date(yesterday);
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
      dayBeforeYesterday.setHours(23, 59, 59, 999);
      
      // Get energy readings
      const yesterdayReading = await this.getTotalEnergyAtDate(yesterday);
      const dayBeforeReading = await this.getTotalEnergyAtDate(dayBeforeYesterday);
      
      // Daily Total = yesterday's reading - day before yesterday's reading
      const dailyTotal = yesterdayReading - dayBeforeReading;
      
      // Average hourly consumption of yesterday
      const avgHourly = dailyTotal / 24;
      
      // Peak hour consumption of yesterday
      const peakHour = await this.getPeakHourOfDay(yesterday);
      
      return {
        totalValue: dailyTotal,
        totalLabel: 'Daily Total',
        avgValue: avgHourly,
        avgLabel: 'Avg Hourly',
        peakValue: peakHour.value,
        peakLabel: 'Peak Hour',
        peakDetail: `at ${peakHour.hour}:00`
      };
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return this.getEmptySummary();
    }
  }
  
  /**
   * Get weekly summary data (last week's consumption)
   */
  async getWeeklySummary(): Promise<SummaryCardData> {
    try {
      const today = new Date();
      
      // Last week end (last Sunday)
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay());
      lastWeekEnd.setHours(23, 59, 59, 999);
      
      // Last week start (Monday of last week)
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      lastWeekStart.setHours(0, 0, 0, 0);
      
      // Before last week (end of previous period)
      const beforeLastWeek = new Date(lastWeekStart);
      beforeLastWeek.setDate(beforeLastWeek.getDate() - 1);
      beforeLastWeek.setHours(23, 59, 59, 999);
      
      // Get energy readings
      const lastWeekReading = await this.getTotalEnergyAtDate(lastWeekEnd);
      const beforeLastWeekReading = await this.getTotalEnergyAtDate(beforeLastWeek);
      
      // Weekly Total = last week's reading - previous reading
      const weeklyTotal = lastWeekReading - beforeLastWeekReading;
      
      // Average daily consumption of last week
      const avgDaily = weeklyTotal / 7;
      
      // Peak day of last week
      const peakDay = await this.getPeakDayOfWeek(lastWeekStart, lastWeekEnd);
      
      return {
        totalValue: weeklyTotal,
        totalLabel: 'Weekly Total',
        avgValue: avgDaily,
        avgLabel: 'Avg Daily',
        peakValue: peakDay.value,
        peakLabel: 'Peak Day',
        peakDetail: `on ${peakDay.day}`
      };
    } catch (error) {
      console.error('Error getting weekly summary:', error);
      return this.getEmptySummary();
    }
  }
  
  /**
   * Get monthly summary data (last month's consumption)
   */
  async getMonthlySummary(): Promise<SummaryCardData> {
    try {
      const today = new Date();
      
      // Last month end
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      lastMonthEnd.setHours(23, 59, 59, 999);
      
      // Last month start
      const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
      lastMonthStart.setHours(0, 0, 0, 0);
      
      // Before last month (end of previous period)
      const beforeLastMonth = new Date(lastMonthStart);
      beforeLastMonth.setDate(beforeLastMonth.getDate() - 1);
      beforeLastMonth.setHours(23, 59, 59, 999);
      
      // Get energy readings
      const lastMonthReading = await this.getTotalEnergyAtDate(lastMonthEnd);
      const beforeLastMonthReading = await this.getTotalEnergyAtDate(beforeLastMonth);
      
      // Monthly Total = last month's reading - previous reading
      const monthlyTotal = lastMonthReading - beforeLastMonthReading;
      
      // Average weekly consumption of last month
      const daysInMonth = lastMonthEnd.getDate();
      const weeksInMonth = Math.ceil(daysInMonth / 7);
      const avgWeekly = monthlyTotal / weeksInMonth;
      
      // Peak week of last month
      const peakWeek = await this.getPeakWeekOfMonth(lastMonthStart, lastMonthEnd);
      
      return {
        totalValue: monthlyTotal,
        totalLabel: 'Monthly Total',
        avgValue: avgWeekly,
        avgLabel: 'Avg Weekly',
        peakValue: peakWeek.value,
        peakLabel: 'Peak Week',
        peakDetail: `week ${peakWeek.week}`
      };
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return this.getEmptySummary();
    }
  }
  
  /**
   * Get total energy reading at a specific date
   */
  private async getTotalEnergyAtDate(date: Date): Promise<number> {
    try {
      // In a real implementation, you would query historical data for this specific date
      // For now, we'll use current sensor data as a baseline
      const sensors = await sensorService.getAllSensorData();
      const totalEnergy = Object.values(sensors).reduce((sum, sensor) => sum + (sensor.energy || 0), 0);
      
      // Simulate historical data based on date difference
      const daysDiff = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      const simulatedReading = Math.max(0, totalEnergy - (daysDiff * 0.5)); // Assume 0.5kWh per day consumption
      
      return simulatedReading;
    } catch (error) {
      console.error('Error getting total energy at date:', error);
      return 0;
    }
  }
  
  /**
   * Get peak energy from start of day until now
   */
  private async getPeakEnergyFromStartOfDay(): Promise<{ value: number; time: string }> {
    try {
      // In a real implementation, you would query hourly data from start of day
      const sensors = await sensorService.getAllSensorData();
      const currentEnergy = Object.values(sensors).reduce((sum, sensor) => sum + (sensor.energy || 0), 0);
      
      // Simulate peak time (typically evening hours)
      const peakTime = new Date();
      peakTime.setHours(19, 0, 0, 0); // 7 PM as typical peak
      
      return {
        value: currentEnergy * 1.2, // Assume peak is 20% higher
        time: peakTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
    } catch (error) {
      console.error('Error getting peak energy from start of day:', error);
      return { value: 0, time: '00:00' };
    }
  }
  
  /**
   * Get peak hour of a specific day
   */
  private async getPeakHourOfDay(date: Date): Promise<{ value: number; hour: number }> {
    try {
      // In a real implementation, you would query hourly data for this date
      const sensors = await sensorService.getAllSensorData();
      const dailyTotal = Object.values(sensors).reduce((sum, sensor) => sum + (sensor.dailyEnergy || 0), 0);
      
      // Simulate peak hour (typically evening)
      const peakHour = 19; // 7 PM
      const peakValue = dailyTotal / 24 * 1.5; // Assume peak hour is 50% above average
      
      return { value: peakValue, hour: peakHour };
    } catch (error) {
      console.error('Error getting peak hour of day:', error);
      return { value: 0, hour: 0 };
    }
  }
  
  /**
   * Get peak day of a week
   */
  private async getPeakDayOfWeek(startDate: Date, endDate: Date): Promise<{ value: number; day: string }> {
    try {
      // In a real implementation, you would query daily data for this week
      const sensors = await sensorService.getAllSensorData();
      const weeklyTotal = Object.values(sensors).reduce((sum, sensor) => sum + (sensor.energy || 0), 0) * 0.1; // Simulate weekly consumption
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const peakDay = days[Math.floor(Math.random() * days.length)]; // Random for simulation
      const peakValue = weeklyTotal / 7 * 1.3; // Assume peak day is 30% above average
      
      return { value: peakValue, day: peakDay };
    } catch (error) {
      console.error('Error getting peak day of week:', error);
      return { value: 0, day: 'Monday' };
    }
  }
  
  /**
   * Get peak week of a month
   */
  private async getPeakWeekOfMonth(startDate: Date, endDate: Date): Promise<{ value: number; week: number }> {
    try {
      // In a real implementation, you would query weekly data for this month
      const sensors = await sensorService.getAllSensorData();
      const monthlyTotal = Object.values(sensors).reduce((sum, sensor) => sum + (sensor.energy || 0), 0) * 0.3; // Simulate monthly consumption
      
      const weeksInMonth = Math.ceil((endDate.getDate() - startDate.getDate() + 1) / 7);
      const peakWeek = Math.ceil(Math.random() * weeksInMonth); // Random for simulation
      const peakValue = monthlyTotal / weeksInMonth * 1.4; // Assume peak week is 40% above average
      
      return { value: peakValue, week: peakWeek };
    } catch (error) {
      console.error('Error getting peak week of month:', error);
      return { value: 0, week: 1 };
    }
  }
  
  /**
   * Get empty summary data as fallback
   */
  private getEmptySummary(): SummaryCardData {
    return {
      totalValue: 0,
      totalLabel: 'Total',
      avgValue: 0,
      avgLabel: 'Average',
      peakValue: 0,
      peakLabel: 'Peak',
      peakDetail: ''
    };
  }
}

export const energyCalculationService = new EnergyCalculationService();
