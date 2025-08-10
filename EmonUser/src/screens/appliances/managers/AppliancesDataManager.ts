import { getAuth } from 'firebase/auth';
import { deviceService } from '../../../services/devices/deviceService';
import { sensorService } from '../../../services/sensors/sensorService';

export interface Appliance {
  id: string;
  name: string;
  icon: string;
  group: string;
  deviceId: string;
  deviceName?: string;
  deviceSerialNumber?: string;
  isActive: boolean;
  createdAt: Date;
  maxRuntime?: { value: number; unit: string };
  maxKWh?: number;
  notificationsEnabled: boolean;
}

export type DeviceStatuses = { [deviceId: string]: { isConnected: boolean; applianceState: boolean } };

export class AppliancesDataManager {
  private setAppliances: (a: Appliance[]) => void;
  private setLoading: (b: boolean) => void;
  private setDeviceStatuses: (updater: any) => void;
  private setSensorData: (updater: any) => void;
  private setAvailableGroups: (groups: string[]) => void;
  private setRefreshing: (b: boolean) => void;

  constructor(params: {
    setAppliances: (a: Appliance[]) => void;
    setLoading: (b: boolean) => void;
    setDeviceStatuses: (updater: any) => void;
    setSensorData: (updater: any) => void;
    setAvailableGroups: (groups: string[]) => void;
    setRefreshing: (b: boolean) => void;
  }) {
    this.setAppliances = params.setAppliances;
    this.setLoading = params.setLoading;
    this.setDeviceStatuses = params.setDeviceStatuses;
    this.setSensorData = params.setSensorData;
    this.setAvailableGroups = params.setAvailableGroups;
    this.setRefreshing = params.setRefreshing;
  }

  initialize = async (): Promise<() => void> => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return () => {};

    const unsubscribe = await this.loadAppliances();
    return () => {
      try { unsubscribe && unsubscribe(); } catch {}
    };
  };

  loadAppliances = async (): Promise<() => void> => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return () => {};

    try {
      this.setLoading(true);
      const userAppliances = await deviceService.getUserAppliances(currentUser.uid);
      const userDevices = await deviceService.getUserDevices(currentUser.uid);

      const appliancesWithDeviceInfo: Appliance[] = userAppliances.map((appliance: any) => {
        const device = userDevices.find(d => d.id === appliance.deviceId);
        return {
          ...appliance,
          deviceName: device?.name || 'Unknown Device',
          deviceSerialNumber: device?.serialNumber || 'Unknown',
        } as Appliance;
      });

      this.setAppliances(appliancesWithDeviceInfo);
      const groups = Array.from(new Set(appliancesWithDeviceInfo.map(a => a.group).filter(Boolean))).sort();
      this.setAvailableGroups(groups);

      const unsubscribers: (() => void)[] = [];

      userDevices.forEach(device => {
        const connUnsub = deviceService.listenToDeviceConnection(
          device.serialNumber,
          (isConnected, applianceState) => {
            this.setDeviceStatuses((prev: any) => ({
              ...prev,
              [device.id]: { isConnected, applianceState }
            }));
          }
        );
        unsubscribers.push(connUnsub);

        const sensorId = this.getSensorIdFromSerialNumber(device.serialNumber);
        const sensorUnsub = sensorService.listenToSensor(sensorId, (data) => {
          this.setSensorData((prev: any) => ({
            ...prev,
            [device.serialNumber]: data
          }));
        });
        unsubscribers.push(sensorUnsub);
      });

      return () => { unsubscribers.forEach(u => { try { u(); } catch {} }); };
    } catch (e) {
      console.error('AppliancesDataManager.loadAppliances error:', e);
      this.setLoading(false);
      return () => {};
    } finally {
      this.setLoading(false);
    }
  };

  refresh = async () => {
    this.setRefreshing(true);
    try {
      await this.loadAppliances();
    } finally {
      this.setRefreshing(false);
    }
  };

  toggleApplianceState = async (appliance: Appliance, deviceStatuses: DeviceStatuses) => {
    try {
      const sensorId = this.getSensorIdFromSerialNumber(appliance.deviceSerialNumber || '');
      if (!sensorId) throw new Error(`No sensor ID for serial ${appliance.deviceSerialNumber}`);

      const currentState = deviceStatuses[appliance.deviceId]?.applianceState || false;
      const newState = !currentState;
      await sensorService.updateApplianceState(sensorId, newState);

      this.setDeviceStatuses((prev: any) => ({
        ...prev,
        [appliance.deviceId]: { ...(prev[appliance.deviceId] || { isConnected: false }), applianceState: newState }
      }));
    } catch (e) {
      console.error('toggleApplianceState error:', e);
      throw e;
    }
  };

  deleteAppliance = async (userId: string, applianceId: string) => {
    await deviceService.deleteUserAppliance(userId, applianceId);
  };

  bulkDeleteAppliances = async (userId: string, ids: string[]) => {
    await Promise.all(ids.map(id => deviceService.deleteUserAppliance(userId, id)));
  };

  // Helpers
  private getSensorIdFromSerialNumber = (serialNumber: string): string => {
    if (!serialNumber) return '1';
    const currentPattern = serialNumber.match(/^11032(\d{2})(\d)$/);
    if (currentPattern) return currentPattern[2];
    const lastDigitMatch = serialNumber.match(/(\d+)$/);
    if (lastDigitMatch) {
      const lastDigits = lastDigitMatch[1];
      return lastDigits.length > 2 ? lastDigits.slice(-1) : lastDigits;
    }
    const hash = serialNumber.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff, 0);
    const sensorId = (Math.abs(hash) % 100 + 1).toString();
    return sensorId;
  };
}
