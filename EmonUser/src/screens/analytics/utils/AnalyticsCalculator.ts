import { SensorReadingModel } from '../../../models/SensorReading';
import { ChartData, TimePeriod } from '../managers/AnalyticsDataManager';

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
    const currentEnergy = Object.values(sensors).reduce((sum, sensor) => {
      return sum + (sensor.energy || 0);
    }, 0);
    
    switch (period) {
      case 'Realtime':
        const realtimeStatus = currentEnergy > average * 1.1 ? 'above' : currentEnergy < average * 0.9 ? 'below' : 'at';
        return `Current energy consumption is ${currentEnergy.toFixed(3)}kWh, which is ${realtimeStatus} your recent average of ${average.toFixed(3)}kWh. Peak energy usage was ${peak.toFixed(3)}kWh and lowest was ${low.toFixed(3)}kWh. Total energy consumed in this monitoring period is ${total.toFixed(3)}kWh.`;
      
      case 'Daily':
        const peakHour = chartData.labels[chartData.data.indexOf(peak)];
        return `Your average hourly energy consumption today is ${average.toFixed(2)}kWh. Peak usage occurred at ${peakHour} with ${peak.toFixed(2)}kWh. Total daily energy consumption is ${total.toFixed(2)}kWh, costing approximately $${(total * 0.12).toFixed(2)}.`;
      
      case 'Weekly':
        const peakDay = chartData.labels[chartData.data.indexOf(peak)];
        return `Weekly average daily energy consumption is ${average.toFixed(1)}kWh. Highest consumption was on ${peakDay} with ${peak.toFixed(1)}kWh. Total weekly energy consumption is ${total.toFixed(1)}kWh, costing approximately $${(total * 0.12).toFixed(2)}.`;
      
      case 'Monthly':
        const monthlyCost = (total * 0.12).toFixed(2);
        return `Monthly average daily energy consumption is ${average.toFixed(1)}kWh. Peak daily usage was ${peak.toFixed(1)}kWh on day ${chartData.data.indexOf(peak) + 1}. Total monthly consumption is ${total.toFixed(1)}kWh, costing approximately $${monthlyCost}.`;
      
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
      recommendations.push('Schedule high-energy devices during off-peak hours to save on electricity costs');
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

  static getBarColor(value: number, average: number): string {
    const ratio = value / average;
    
    if (ratio >= 1.3) return '#F44336'; // Red - High consumption
    if (ratio >= 1.1) return '#FF9800'; // Orange - Above average
    if (ratio >= 0.9) return '#5B934E'; // Green - Normal
    if (ratio >= 0.7) return '#4CAF50'; // Light green - Low consumption
    return '#2E7D32'; // Dark green - Very low consumption
  }

  static formatConsumptionValue(value: number, period: TimePeriod): string {
    // All values are now in kWh
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
}
