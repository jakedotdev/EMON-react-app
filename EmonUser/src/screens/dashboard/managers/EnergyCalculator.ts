import { SensorReadingModel } from '../../../models/SensorReading';

export interface EnergyTotals {
  totalEnergy: number;
  totalDevices: number;
  onlineAppliances: number;
}

export class EnergyCalculator {
  static calculateTotals(
    sensorData: { [key: string]: SensorReadingModel },
    userAppliances: any[],
    userDevices: any[]
  ): EnergyTotals {
    console.log('=== Calculating Totals ===');
    console.log('userDevices:', userDevices.length);
    console.log('userAppliances:', userAppliances.length);
    console.log('sensorData keys:', Object.keys(sensorData));
    
    // Step 1: Get serial numbers of devices that have appliances registered
    const applianceDeviceSerials = new Set(
      userAppliances.map(appliance => {
        const device = userDevices.find(d => d.id === appliance.deviceId);
        console.log(`Appliance "${appliance.name}" -> Device "${device?.name}" (${device?.serialNumber})`);
        return device?.serialNumber;
      }).filter(Boolean) // Remove undefined values
    );

    console.log('applianceDeviceSerials:', Array.from(applianceDeviceSerials));

    // Step 2: Calculate totals ONLY from sensors that match appliance devices
    let totalEnergySum = 0;
    let onlineCount = 0;
    const countedOnlineSerials = new Set<string>();

    Object.entries(sensorData).forEach(([sensorKey, sensor]) => {
      try {
        console.log(`Checking sensor ${sensorKey}: serialNumber=${sensor.serialNumber}, energy=${sensor.energy}, applianceState=${sensor.applianceState}`);
        
        // Validate minimal shape
        if (!sensor || typeof sensor !== 'object') return;

        const serial = (sensor as any).serialNumber as string | undefined;
        if (!serial) return;

        // Check if this sensor's serialNumber matches any appliance device serial numbers
        if (applianceDeviceSerials.has(serial)) {
          console.log(`✅ Found matching appliance device sensor ${serial}: energy=${sensor.energy}, applianceState=${sensor.applianceState}`);
          
          // Sum energy from devices that have appliances
          const energyVal = typeof sensor.energy === 'number' && isFinite(sensor.energy) ? sensor.energy : 0;
          totalEnergySum += energyVal;
          
          // Normalize applianceState to boolean ON
          const rawState: any = (sensor as any).applianceState;
          const isOn = (rawState === true)
            || (typeof rawState === 'string' && rawState.toLowerCase() === 'true')
            || (typeof rawState === 'number' && rawState === 1);

          if (isOn && !countedOnlineSerials.has(serial)) {
            countedOnlineSerials.add(serial);
            onlineCount++;
          }
        }
      } catch (err) {
        console.warn(`Error processing sensor ${sensorKey}:`, err);
      }
    });

    const totals: EnergyTotals = {
      totalEnergy: totalEnergySum,
      totalDevices: userDevices.length, // Total registered devices
      onlineAppliances: onlineCount // Count of appliances that are turned ON
    };

    console.log(`Final totals: energy=${totals.totalEnergy}, totalDevices=${totals.totalDevices}, onlineAppliances=${totals.onlineAppliances}`);

    return totals;
  }

  static formatEnergy(energy: number): string {
    return energy.toFixed(3);
  }

  static formatEnergyWithUnit(energy: number): string {
    return `${EnergyCalculator.formatEnergy(energy)} kWh`;
  }

  static getEnergyStatus(energy: number, maxEnergy: number): 'low' | 'medium' | 'high' {
    const percentage = (energy / maxEnergy) * 100;
    
    if (percentage < 30) return 'low';
    if (percentage < 70) return 'medium';
    return 'high';
  }

  static getStatusColor(status: 'low' | 'medium' | 'high'): string {
    switch (status) {
      case 'low': return '#5B934E'; // Green
      case 'medium': return '#F39C12'; // Orange
      case 'high': return '#E74C3C'; // Red
      default: return '#5B934E';
    }
  }
}
