export interface Device {
  id: string;
  serialNumber: string;
  name: string;
  userId: string;
  isActivated: boolean;
  isConnected: boolean;
  applianceState: boolean;
  createdAt: Date;
  activatedAt?: Date;
}

export interface DeviceRegistration {
  serialNumber: string;
  deviceName: string;
  isConnected: boolean;
  applianceState: boolean;
}

export interface ApplianceRegistration {
  deviceId: string;
  name: string;
  icon: string;
  group: string;
  maxRuntime?: {
    value: number;
    unit: 'hours' | 'minutes' | 'seconds';
  };
  maxKWh?: number;
  notificationsEnabled: boolean;
}

