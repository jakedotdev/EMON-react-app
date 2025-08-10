export interface GaugeSettings {
  maxValue: number;
  divisor: number;
}

export interface GaugeInterval {
  value: number;
  position: number;
}

export class GaugeManager {
  private settings: GaugeSettings;

  constructor(maxValue: number = 7, divisor: number = 1) {
    this.settings = {
      maxValue,
      divisor
    };
  }

  getSettings(): GaugeSettings {
    return { ...this.settings };
  }

  updateSettings(maxValue: number, divisor: number): void {
    this.settings = {
      maxValue: Math.max(1, Math.min(50, maxValue)), // Clamp between 1-50
      divisor: [1, 2, 3, 5].includes(divisor) ? divisor : 1 // Only allow valid divisors
    };
  }

  generateIntervals(): GaugeInterval[] {
    const { maxValue, divisor } = this.settings;
    const intervals: GaugeInterval[] = [];
    let intervalStep = divisor;
    
    // If max value is not divisible by the selected divisor, use 1-unit intervals
    if (maxValue % divisor !== 0 && divisor !== 1) {
      intervalStep = 1;
    }
    
    // Generate intervals from 0 to maxValue with the selected step
    for (let i = 0; i <= maxValue; i += intervalStep) {
      intervals.push({
        value: i,
        position: (i / maxValue) * 100 // Percentage position
      });
    }
    
    // Always include the max value if it's not already included
    if (intervals[intervals.length - 1]?.value !== maxValue) {
      intervals.push({
        value: maxValue,
        position: 100
      });
    }

    return intervals;
  }

  calculateGaugeProgress(currentEnergy: number): number {
    const percentage = (currentEnergy / this.settings.maxValue) * 100;
    return Math.min(100, Math.max(0, percentage));
  }

  getGaugeColor(currentEnergy: number): string {
    const percentage = this.calculateGaugeProgress(currentEnergy);
    
    if (percentage < 30) return '#5B934E'; // Green - Low usage
    if (percentage < 70) return '#F39C12'; // Orange - Medium usage
    return '#E74C3C'; // Red - High usage
  }

  isValidMaxValue(value: number): boolean {
    return value >= 1 && value <= 50 && Number.isInteger(value);
  }

  isValidDivisor(divisor: number): boolean {
    return [1, 2, 3, 5].includes(divisor);
  }

  isDivisible(maxValue: number, divisor: number): boolean {
    return maxValue % divisor === 0;
  }

  getValidationMessage(maxValue: number, divisor: number): string | null {
    if (!this.isValidMaxValue(maxValue)) {
      return 'Max value must be between 1 and 50';
    }
    
    if (!this.isValidDivisor(divisor)) {
      return 'Divisor must be 1, 2, 3, or 5';
    }
    
    if (!this.isDivisible(maxValue, divisor) && divisor !== 1) {
      return `Max value ${maxValue} is not divisible by ${divisor}. Will use 1-unit intervals.`;
    }
    
    return null;
  }

  static formatGaugeValue(value: number): string {
    return value.toFixed(1);
  }

  static formatGaugeValueWithUnit(value: number): string {
    return `${GaugeManager.formatGaugeValue(value)} kWh`;
  }
}
