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
    const { labels, data, average, peak, low, total } = chartData;
    const recs: string[] = [];

    // Helper: instantaneous delta for Realtime (currentTotal - previousTotal)
    const getRealtimeInstant = (): number => {
      const currentTotal = Object.values(sensors).reduce((sum, s) => sum + (s.energy || 0), 0);
      const todayKey = new Date().toISOString().slice(0, 10);
      const { delta } = peakTrackerService.updateAndGet('recs', todayKey, currentTotal);
      return Math.max(0, delta);
    };

    switch (period) {
      case 'Realtime': {
        const instant = getRealtimeInstant();
        // Compare instantaneous rate vs recent average of the chart
        if (average > 0 && instant > average * 1.2) {
          recs.push('Power use is higher than usual. Wait to run non‑essential appliances.');
        } else if (average > 0 && instant < average * 0.6) {
          recs.push('Power use is low. This is a good time to run heavy appliances.');
        }
        // Peak proximity
        if (peak > 0 && instant >= peak * 0.9) {
          recs.push('You’re close to today’s highest use. Don’t start more appliances now.');
        }
        // Stability guidance
        const variability = average > 0 ? (peak - low) / average : 0;
        if (variability > 0.6) recs.push('Avoid turning on many appliances at once.');
        break;
      }

      case 'Daily': {
        // Identify peak hour and suggest shifting
        const peakIdx = data.indexOf(peak);
        const peakHour = peakIdx >= 0 && labels[peakIdx] ? labels[peakIdx] : 'peak hour';
        if (peak > average * 1.3) {
          recs.push(`Try not to run extra appliances around ${peakHour}.`);
        }
        // Nighttime baseline (00:00–05:00) high implies standby/leakage
        const nightIndices = labels.map((l, i) => (/^([0-1]?\d):00$/.test(l) ? Number(l.split(':')[0]) : NaN)).map((h, i) => (h >= 0 && h <= 5 ? i : -1)).filter(i => i >= 0);
        if (nightIndices.length) {
          const nightAvg = nightIndices.reduce((s, i) => s + (data[i] || 0), 0) / nightIndices.length;
          if (nightAvg > average * 0.7) recs.push('At night, unplug chargers and turn off always‑on devices.');
        }
        // Low periods suggestion
        const minIdx = data.indexOf(low);
        const lowHour = minIdx >= 0 && labels[minIdx] ? labels[minIdx] : 'low hour';
        recs.push(`Run heavy appliances around ${lowHour} when usage is lowest.`);
        break;
      }

      case 'Weekly': {
        // Peak day vs average day
        const peakIdx = data.indexOf(peak);
        const peakDay = peakIdx >= 0 && labels[peakIdx] ? labels[peakIdx] : 'peak day';
        if (peak > average * 1.3) recs.push(`Spread heavy tasks across the week, not all on ${peakDay}.`);

        // Weekend vs weekday balancing hint if labels contain day names
        const dayName = (lbl: string) => lbl?.toLowerCase?.() || '';
        const weekendIdx = labels.map((l, i) => (/sat|sun/.test(dayName(l)) ? i : -1)).filter(i => i >= 0);
        if (weekendIdx.length) {
          const weekendAvg = weekendIdx.reduce((s, i) => s + (data[i] || 0), 0) / weekendIdx.length;
          if (weekendAvg > average * 1.1) recs.push('Weekends use more power. Do some chores on weekdays if you can.');
        }
        // Consistency guidance
        const variability = average > 0 ? (Math.max(...data) - Math.min(...data)) / average : 0;
        if (variability > 0.6) recs.push('Plan big tasks on different days to keep usage steady.');
        break;
      }

      case 'Monthly': {
        // Peak week suggestion (labels may be day numbers; use peak index meaningfully if week labels provided)
        const peakIdx = data.indexOf(peak);
        const peakLabel = peakIdx >= 0 && labels[peakIdx] ? labels[peakIdx] : 'peak week';
        if (peak > average * 1.2) recs.push(`Avoid extra use around ${peakLabel}. Spread it out.`);

        // Mid-month check and budgeting hint
        if (total > 0 && average > 0) {
          recs.push('Set a monthly power budget and check progress each week.');
        }
        // Identify lowest period to schedule heavy tasks
        const minIdx = data.indexOf(low);
        const lowLabel = minIdx >= 0 && labels[minIdx] ? labels[minIdx] : 'low period';
        recs.push(`Do power‑hungry tasks near ${lowLabel} when usage is lowest.`);
        break;
      }

      default:
        break;
    }

    // Fallback suggestions if few were generated
    if (recs.length === 0) {
      recs.push('Your energy use looks good. Keep it up.');
      recs.push('Use timers or schedules so heavy appliances don’t overlap.');
    }

    // Efficiency-based recommendations
    const efficiency = this.calculateEfficiencyRating(chartData);
    if (efficiency.rating === 'C' || efficiency.rating === 'D') {
      if (recs.length < 4) recs.push('Consider an energy checkup to find waste.');
      if (recs.length < 4) recs.push('Use smart plugs or schedules to cut waste.');
    }

    return recs.slice(0, 4); // Limit to 4 recommendations
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
