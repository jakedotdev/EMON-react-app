import { Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import { sensorService } from '../../../services/sensors/sensorService';
import { deviceService } from '../../../services/devices/deviceService';
import { SensorReadingModel } from '../../../models/SensorReading';
import { authService } from '../../../services/auth/authService';
import { TimeFormatter } from '../utils/TimeFormatter';

export interface DashboardData {
  sensors: { [key: string]: SensorReadingModel };
  userAppliances: any[];
  userDevices: any[];
  currentUser: any;
  loading: boolean;
  refreshing: boolean;
}

export class DashboardDataManager {
  private setSensors: (sensors: { [key: string]: SensorReadingModel }) => void;
  private setUserAppliances: (appliances: any[]) => void;
  private setUserDevices: (devices: any[]) => void;
  private setCurrentUser: (user: any) => void;
  private setLoading: (loading: boolean) => void;
  private setRefreshing: (refreshing: boolean) => void;

  constructor(
    setSensors: (sensors: { [key: string]: SensorReadingModel }) => void,
    setUserAppliances: (appliances: any[]) => void,
    setUserDevices: (devices: any[]) => void,
    setCurrentUser: (user: any) => void,
    setLoading: (loading: boolean) => void,
    setRefreshing: (refreshing: boolean) => void
  ) {
    this.setSensors = setSensors;
    this.setUserAppliances = setUserAppliances;
    this.setUserDevices = setUserDevices;
    this.setCurrentUser = setCurrentUser;
    this.setLoading = setLoading;
    this.setRefreshing = setRefreshing;
  }

  async initialize(): Promise<() => void> {
    // Set current user from Firebase Auth
    const auth = getAuth();
    const currentUser = auth.currentUser;
    this.setCurrentUser(currentUser);

    // Apply preferred timezone from user profile for app-wide formatting
    try {
      if (currentUser?.uid) {
        const profile = await authService.getUserProfile(currentUser.uid);
        TimeFormatter.setTimeZone(profile?.preferredTimezone);
      } else {
        TimeFormatter.setTimeZone(undefined);
      }
    } catch (e) {
      // Fallback to device timezone if profile fetch fails
      TimeFormatter.setTimeZone(undefined);
    }

    const sensorUnsubscribe = await this.loadSensorData();
    await this.loadUserData();

    // Set up time interval
    const timeInterval = setInterval(() => {
      // Trigger time updates if needed
    }, 1000);

    return () => {
      clearInterval(timeInterval);
      sensorUnsubscribe();
    };
  }

  async loadSensorData(): Promise<() => void> {
    const unsubscribe = sensorService.listenToAllSensors((sensorData) => {
      this.setSensors(sensorData);
      this.setLoading(false);
    });

    return unsubscribe;
  }

  async loadUserData(): Promise<void> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log('No authenticated user found');
        return;
      }

      console.log('Loading user data for:', currentUser.uid);

      // Refresh timezone in case it changed
      try {
        const profile = await authService.getUserProfile(currentUser.uid);
        TimeFormatter.setTimeZone(profile?.preferredTimezone);
      } catch (_) {
        // Ignore and keep existing/time device fallback
      }

      // Load user's appliances and devices
      const [userAppliances, userDevices] = await Promise.all([
        deviceService.getUserAppliances(currentUser.uid),
        deviceService.getUserDevices(currentUser.uid)
      ]);

      console.log('Loaded appliances:', userAppliances.length);
      console.log('Loaded devices:', userDevices.length);

      this.setUserAppliances(userAppliances);
      this.setUserDevices(userDevices);
    } catch (err) {
      console.error('Error loading user data:', err);
      Alert.alert('Error', 'Failed to load user data');
    }
  }

  async refresh(): Promise<void> {
    this.setRefreshing(true);
    
    try {
      // Get fresh sensor data without temporary subscription to avoid unsubscribe race
      const sensorData = await sensorService.getAllSensorData();

      this.setSensors(sensorData);
      await this.loadUserData();
    } catch (err) {
      console.error('Error refreshing data:', err);
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      this.setRefreshing(false);
    }
  }



  async toggleApplianceState(appliance: any, device: any, value: boolean, sensors: { [key: string]: any }): Promise<void> {
    if (!device) {
      Alert.alert('Error', 'Device not found');
      return;
    }

    try {
      // Find the sensor ID based on the device serial number
      const sensorKey = Object.keys(sensors).find(key =>
        sensors[key].serialNumber === device.serialNumber
      );

      if (!sensorKey) {
        Alert.alert('Error', 'Sensor not found for this device');
        return;
      }

      // Extract sensor ID from key (e.g., "SensorReadings_2" -> "2")
      const sensorId = sensorKey === 'SensorReadings' ? '1' : sensorKey.replace('SensorReadings_', '');

      // Update the appliance state in Firebase Realtime Database
      await sensorService.updateApplianceState(sensorId, value);
      // Success confirmation removed as per UX requirement
    } catch (err) {
      console.error('Error toggling appliance:', err);
      Alert.alert('Error', 'Failed to toggle appliance. Please try again.');
    }
  }
}
