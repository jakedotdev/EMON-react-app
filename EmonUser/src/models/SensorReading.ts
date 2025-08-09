export interface SensorReading {
  serialNumber: string;
  power: number;
  voltage: number;
  current: number;
  energy: number;
  dailyEnergy?: number; // Only present in SensorReadings_1
  applianceState: boolean;
  runtimehr: number;
  runtimemin: number;
  runtimesec: number;
  resetEnergy?: boolean;
  resetInProgress?: boolean;
  WIFI_SSID?: string;
  WIFI_PASSWORD?: string;
}

export class SensorReadingModel {
  constructor(data: SensorReading) {
    this.serialNumber = data.serialNumber || "";
    this.power = data.power || 0;
    this.voltage = data.voltage || 0;
    this.current = data.current || 0;
    this.energy = data.energy || 0;
    this.dailyEnergy = data.dailyEnergy || 0;
    this.applianceState = data.applianceState || false;
    this.runtimehr = data.runtimehr || 0;
    this.runtimemin = data.runtimemin || 0;
    this.runtimesec = data.runtimesec || 0;
    this.resetEnergy = data.resetEnergy || false;
    this.resetInProgress = data.resetInProgress || false;
    this.WIFI_SSID = data.WIFI_SSID || "";
    this.WIFI_PASSWORD = data.WIFI_PASSWORD || "";
  }

  serialNumber: string;
  power: number;
  voltage: number;
  current: number;
  energy: number;
  dailyEnergy: number;
  applianceState: boolean;
  runtimehr: number;
  runtimemin: number;
  runtimesec: number;
  resetEnergy: boolean;
  resetInProgress: boolean;
  WIFI_SSID: string;
  WIFI_PASSWORD: string;

  // Helper methods
  getTotalRuntime(): number {
    return this.runtimehr * 3600 + this.runtimemin * 60 + this.runtimesec;
  }

  getFormattedRuntime(): string {
    return `${this.runtimehr}h ${this.runtimemin}m ${this.runtimesec}s`;
  }

  isOnline(): boolean {
    return this.power > 0 || this.voltage > 0;
  }

  getPowerInWatts(): number {
    return this.power;
  }

  getVoltageInVolts(): number {
    return this.voltage;
  }

  getCurrentInAmps(): number {
    return this.current;
  }

  getEnergyInKWh(): number {
    return this.energy;
  }

  getDailyEnergyInKWh(): number {
    return this.dailyEnergy;
  }
}
