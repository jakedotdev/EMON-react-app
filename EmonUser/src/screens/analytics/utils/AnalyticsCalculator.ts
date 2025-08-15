import { SensorReadingModel } from '../../../models/SensorReading';
import { ChartData, TimePeriod } from '../managers/AnalyticsDataManager';
import { peakTrackerService } from '../../../services/analytics/PeakTrackerService';

export class AnalyticsCalculator {
  static calculateEfficiencyRating(chartData: ChartData): { rating: string; color: string; description: string } {
    const { average, peak, low } = chartData;
    
    // Calculate efficiency based on consumption patterns
    const variability = (peak - low) / average;
    const efficiencyScore = Math.max(0, 100 - (variability * 50) - (average > 150 ? (average - 150) * 0.2 : 0));
    
    if (efficiencyScore >= 85) {
      return {
        rating: 'A+',
        color: '#4CAF50',
        description: 'Excellent energy efficiency with stable consumption patterns'
      };
    } else if (efficiencyScore >= 70) {
      return {
        rating: 'A',
        color: '#8BC34A',
        description: 'Good energy efficiency with minor fluctuations'
      };
    } else if (efficiencyScore >= 55) {
      return {
        rating: 'B',
        color: '#FFC107',
        description: 'Fair energy efficiency, room for improvement'
      };
    } else if (efficiencyScore >= 40) {
      return {
        rating: 'C',
        color: '#FF9800',
        description: 'Below average efficiency, consider optimizing usage'
      };
    } else {
      return {
        rating: 'D',
        color: '#F44336',
        description: 'Poor energy efficiency, immediate attention needed'
      };
    }
  }

  static generateAnalysisText(chartData: ChartData, period: TimePeriod, sensors: { [key: string]: SensorReadingModel }): string {
    const { average, peak, low, total } = chartData;
    // Sum of current total energies across sensors (kWh)
    const currentTotal = Object.values(sensors).reduce((sum, sensor) => {
      return sum + (sensor.energy || 0);
    }, 0);
    // Use in-memory tracker to derive instantaneous current consumption (delta since last reading)
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const { delta } = peakTrackerService.updateAndGet('analysis', todayKey, currentTotal);
    const currentInstant = Math.max(0, delta);
    
    switch (period) {
      case 'Realtime':
        // Realtime chart: six 10‑minute slots within the current hour.
        const populated = Math.min(6, Math.max(0, chartData.data.length));
        const realtimeStatus = currentInstant > average * 1.1 ? 'above' : currentInstant < average * 0.9 ? 'below' : 'near';
        const prevTotalRT = Math.max(0, currentTotal - currentInstant);
        const pIdx = chartData.data.indexOf(peak);
        const pLabel = pIdx >= 0 && pIdx < chartData.labels.length ? chartData.labels[pIdx] : 'this hour';
        return [
          `Each bar is a 10‑minute energy delta inside the current hour (00–10, 10–20, …, 50–60).`,
          `Current slot delta is ${currentInstant.toFixed(3)}kWh = current total ${currentTotal.toFixed(3)}kWh − previous total ${prevTotalRT.toFixed(3)}kWh (${realtimeStatus} recent mean).`,
          `Total this hour = sum of populated slots; average = total ÷ ${populated || 1} populated slot(s).`,
          `Peak slot (${pLabel}) is the maximum 10‑minute delta this hour; low is the minimum slot.`
        ].join('\n');
      
      case 'Daily':
        // Explain methodology: 24 hourly buckets; total = sum(hours); avg = total/numHours; peak = max hour
        const nH = chartData.data.length || 24;
        const peakIndex = chartData.data.indexOf(peak);
        const peakHour = peakIndex >= 0 && peakIndex < chartData.labels.length 
          ? chartData.labels[peakIndex] 
          : 'unknown time';
        const prevTotalDaily = Math.max(0, currentTotal - currentInstant);
        return [
          `Current energy is ${currentInstant.toFixed(3)}kWh derived from current total ${currentTotal.toFixed(3)}kWh minus previous total ${prevTotalDaily.toFixed(3)}kWh (delta since last reading).`,
          `Avg consumption is ${average.toFixed(2)}kWh computed as (sum of hourly buckets from start of day to now ÷ ${nH} hours).`,
          `Peak energy ${peak.toFixed(2)}kWh at ${peakHour} comes from the highest hourly bucket; low is the smallest hourly bucket in today’s range.`
        ].join('\n');
      
      case 'Weekly':
        // Explain methodology: 7 daily buckets (Mon–Sun ISO); total = sum(days); avg = total/7; peak = max day
        const weeklyPeakIndex = chartData.data.indexOf(peak);
        const peakDay = weeklyPeakIndex >= 0 && weeklyPeakIndex < chartData.labels.length 
          ? chartData.labels[weeklyPeakIndex] 
          : 'unknown day';
        const nD = chartData.data.length || 7;
        return [
          `Weekly view aggregates daily deltas into one bucket per day (timezone-aware).`,
          `Average is computed as weekly total ÷ ${nD} days; total is ∑ of daily buckets.`,
          `Peak day (${peakDay}) is identified as the max daily bucket; low is the min daily bucket.`
        ].join('\n');
      
      case 'Monthly':
        // Explain methodology: daily buckets across the month; total=sum(days); avg=total/numDays; peak=max day index
        const monthlyPeakIndex = chartData.data.indexOf(peak);
        const nMD = chartData.data.length || 30;
        const peakDayNumber = monthlyPeakIndex >= 0 ? monthlyPeakIndex + 1 : 0;
        return [
          `Monthly view sums per‑day buckets across the selected month (respecting timezone).`,
          `Average is monthly total ÷ ${nMD} days; total is ∑ of daily buckets.`,
          `Peak occurred on day ${peakDayNumber} (max daily bucket); low is the min daily bucket.`
        ].join('\n');
      
      default:
        return 'Analysis data unavailable for the selected time period.';
    }
  }

  static generateRecommendations(chartData: ChartData, period: TimePeriod, sensors: { [key: string]: SensorReadingModel }): string[] {
    const { average, peak, low, total } = chartData;
    const recommendations: string[] = [];
    
    // Calculate variability based on energy consumption
    const variability = average > 0 ? (peak - low) / average : 0;
    
    // High energy consumption recommendations (adjusted thresholds for kWh)
    const avgThreshold = period === 'Realtime' ? 0.1 : period === 'Daily' ? 2.0 : 10.0;
    if (average > avgThreshold) {
      recommendations.push('Consider using energy-efficient appliances to reduce overall energy consumption');
      recommendations.push('Schedule high-energy devices during off-peak hours to reduce peak load');
    }
    
    // High variability recommendations
    if (variability > 1.5) {
      recommendations.push('Your energy consumption shows high variability - try to spread usage more evenly');
      recommendations.push('Consider using smart timers for appliances to optimize energy distribution');
    }
    
    // Peak usage recommendations
    if (peak > average * 2) {
      recommendations.push('Peak energy usage is significantly high - identify and manage energy-intensive appliances');
      recommendations.push('Use energy monitoring to track which devices cause consumption spikes');
    }
    
    // Period-specific recommendations
    switch (period) {
      case 'Daily':
        if (chartData.data.slice(18, 22).some(val => val > average * 1.3)) {
          recommendations.push('Evening consumption is high - consider reducing lighting and entertainment device usage');
        }
        break;
      case 'Weekly':
        const weekendAvg = (chartData.data[5] + chartData.data[6]) / 2;
        const weekdayAvg = chartData.data.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        if (weekendAvg > weekdayAvg * 1.2) {
          recommendations.push('Weekend consumption is notably higher - be mindful of increased home activity energy usage');
        }
        break;
    }
    
    // Efficiency-based recommendations
    const efficiency = this.calculateEfficiencyRating(chartData);
    if (efficiency.rating === 'C' || efficiency.rating === 'D') {
      recommendations.push('Consider an energy audit to identify inefficient appliances and systems');
      recommendations.push('Implement smart home automation to optimize energy usage patterns');
    }
    
    // Default recommendations if none specific
    if (recommendations.length === 0) {
      recommendations.push('Your energy usage is well-managed - maintain current consumption patterns');
      recommendations.push('Consider renewable energy options to further reduce your carbon footprint');
      recommendations.push('Regular monitoring helps maintain optimal energy efficiency');
    }
    
    return recommendations.slice(0, 4); // Limit to 4 recommendations
  }

  static formatConsumptionValue(value: number, period: TimePeriod): string {
    // Format consumption values based on the selected time period
    switch (period) {
      case 'Realtime':
        return `${value.toFixed(3)}kWh`; // More precision for small real-time values
      case 'Daily':
        return `${value.toFixed(2)}kWh`; // Standard precision for hourly values
      case 'Weekly':
      case 'Monthly':
        return `${value.toFixed(1)}kWh`; // Less precision for larger daily values
      default:
        return `${value.toFixed(2)}kWh`;
    }
  }

  static getBarColor(value: number, average: number): string {
    const ratio = value / average;
    
    if (ratio >= 1.3) return '#F44336'; // Red - High consumption
    if (ratio >= 1.1) return '#FF9800'; // Orange - Above average
    if (ratio >= 0.9) return '#5B934E'; // Green - Normal
    if (ratio >= 0.7) return '#4CAF50'; // Light green - Low consumption
    return '#2E7D32'; // Dark green - Very low consumption
  }
}
