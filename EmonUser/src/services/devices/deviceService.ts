import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { getDatabase, ref, onValue, off, get } from 'firebase/database';
import { Device, DeviceRegistration, ApplianceRegistration } from '../../models/Device';

class DeviceService {
  private db = getFirestore();
  private rtdb = getDatabase();

  // Get user's activated devices from Firestore
  async getUserDevices(userId: string): Promise<Device[]> {
    try {
      const devicesRef = collection(this.db, 'devices');
      const q = query(devicesRef, where('userId', '==', userId), where('isActivated', '==', true));
      const querySnapshot = await getDocs(q);
      
      const devices: Device[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        devices.push({
          id: doc.id,
          serialNumber: data.serialNumber,
          name: data.name,
          userId: data.userId,
          isActivated: data.isActivated,
          isConnected: data.isConnected || false,
          applianceState: data.applianceState || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          activatedAt: data.activatedAt?.toDate(),
        });
      });
      
      return devices;
    } catch (error) {
      console.error('Error fetching user devices:', error);
      throw error;
    }
  }

  // Check if device is connected by monitoring Realtime Database
  listenToDeviceConnection(serialNumber: string, callback: (isConnected: boolean, applianceState: boolean) => void) {
    // Try different possible paths in the Realtime Database
    const possiblePaths = [
      'sensorReadings',
      'SensorReadings',
      'sensor_readings',
      'Sensor_Readings',
      'devices',
      'Devices'
    ];
    
    let unsubscribe: (() => void) | null = null;
    
    const tryPath = (pathIndex: number) => {
      if (pathIndex >= possiblePaths.length) {
        console.log(`Device ${serialNumber} not found in any path, checking root level...`);
        
        // Try searching at root level
        const rootRef = ref(this.rtdb);
        unsubscribe = onValue(rootRef, (snapshot) => {
          try {
            const rootData = snapshot.val();
            console.log('Root level data:', rootData);
            if (rootData) {
              const findDeviceInData = (data: any, path: string = ''): any => {
                if (!data || typeof data !== 'object') return null;
                if (data.serialNumber === serialNumber) {
                  console.log(`Found device at path: ${path}`, data);
                  return data;
                }
                for (const key in data) {
                  const result = findDeviceInData(data[key], `${path}/${key}`);
                  if (result) return result;
                }
                return null;
              };
              const foundDevice = findDeviceInData(rootData);
              if (foundDevice) {
                const applianceState = foundDevice.applianceState || false;
                const hasRecentData = foundDevice.timestamp ? (Date.now() - foundDevice.timestamp) < 30000 : false;
                const isConnected = applianceState || hasRecentData;
                console.log(`Device ${serialNumber} found at root level:`, { applianceState, hasRecentData, isConnected, foundDevice });
                try { callback(isConnected, applianceState); } catch (cbErr) { console.error('callback error:', cbErr); }
              } else {
                console.log(`Device ${serialNumber} not found anywhere in Realtime Database`);
                try { callback(false, false); } catch {}
              }
            } else {
              console.log('No data found at root level');
              try { callback(false, false); } catch {}
            }
          } catch (handlerErr) {
            console.error('Error handling root snapshot:', handlerErr);
          }
        });
        
        return;
      }
      
      const path = possiblePaths[pathIndex];
      const allSensorReadingsRef = ref(this.rtdb, path);
      
      unsubscribe = onValue(allSensorReadingsRef, (snapshot) => {
        try {
          const allData = snapshot.val();
          console.log(`Checking path '${path}':`, allData);
          if (allData) {
            let foundDevice: any = null;
            Object.keys(allData).forEach(key => {
              try {
                const deviceData = allData[key];
                if (deviceData && deviceData.serialNumber === serialNumber) {
                  foundDevice = deviceData;
                }
              } catch (childErr) {
                console.warn('Error processing device data:', childErr);
              }
            });
            if (foundDevice) {
              const applianceState = foundDevice.applianceState || false;
              const hasRecentData = foundDevice.timestamp ? (Date.now() - foundDevice.timestamp) < 30000 : false;
              const isConnected = applianceState || hasRecentData;
              console.log(`Device ${serialNumber} connection status:`, { applianceState, hasRecentData, isConnected, foundDevice });
              try { callback(isConnected, applianceState); } catch (cbErr) { console.error('callback error:', cbErr); }
            } else {
              console.log(`Device ${serialNumber} not found in ${path}, trying next path...`);
              tryPath(pathIndex + 1);
            }
          } else {
            console.log(`No data found in ${path}, trying next path...`);
            tryPath(pathIndex + 1);
          }
        } catch (handlerErr) {
          console.error('Error handling path snapshot:', handlerErr);
        }
      });
    };
    
    tryPath(0);
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }

  // Register a new appliance to a device
  async registerAppliance(appliance: ApplianceRegistration, userId: string): Promise<string> {
    try {
      const applianceRef = collection(this.db, 'appliances');
      const docRef = doc(applianceRef);
      await setDoc(docRef, {
        ...appliance,
        userId,
        createdAt: new Date(),
        isActive: true,
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error registering appliance:', error);
      throw error;
    }
  }

  // Update device connection status
  async updateDeviceConnection(deviceId: string, isConnected: boolean, applianceState: boolean) {
    try {
      const deviceRef = doc(this.db, 'devices', deviceId);
      await updateDoc(deviceRef, {
        isConnected,
        applianceState,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error updating device connection:', error);
      throw error;
    }
  }

  // Get appliance icons (mock data - in real app this would come from a config)
  getApplianceIcons(): { name: string; icon: string }[] {
    return [
      { name: 'TV', icon: '📺' },
      { name: 'Refrigerator', icon: '❄️' },
      { name: 'Air Conditioner', icon: '❄️' },
      { name: 'Washing Machine', icon: '🧺' },
      { name: 'Dishwasher', icon: '🍽️' },
      { name: 'Microwave', icon: '📟' },
      { name: 'Oven', icon: '🔥' },
      { name: 'Coffee Maker', icon: '☕' },
      { name: 'Toaster', icon: '🍞' },
      { name: 'Blender', icon: '🥤' },
      { name: 'Fan', icon: '💨' },
      { name: 'Heater', icon: '🔥' },
      { name: 'Computer', icon: '💻' },
      { name: 'Laptop', icon: '💻' },
      { name: 'Phone Charger', icon: '📱' },
      { name: 'Lamp', icon: '💡' },
      { name: 'Other', icon: '🔌' },
    ];
  }

  // Get appliance groups (mock data - in real app this would be user-configurable)
  getApplianceGroups(): string[] {
    return [
      'Living Room',
      'Kitchen',
      'Bedroom',
      'Bathroom',
      'Office',
      'Garage',
      'Basement',
      'Other',
    ];
  }

  // Get user's registered appliances
  async getUserAppliances(userId: string): Promise<any[]> {
    try {
      const appliancesRef = collection(this.db, 'appliances');
      const q = query(appliancesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const appliances: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        appliances.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      
      return appliances;
    } catch (error) {
      console.error('Error fetching user appliances:', error);
      throw error;
    }
  }

  // Get appliances by device ID
  async getAppliancesByDevice(deviceId: string): Promise<any[]> {
    try {
      const appliancesRef = collection(this.db, 'appliances');
      const q = query(appliancesRef, where('deviceId', '==', deviceId));
      const querySnapshot = await getDocs(q);

      const appliances: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        appliances.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      return appliances;
    } catch (error) {
      console.error('Error fetching appliances by device:', error);
      throw error;
    }
  }

  // Delete user appliance
  async deleteUserAppliance(userId: string, applianceId: string): Promise<void> {
    try {
      const applianceRef = doc(this.db, 'appliances', applianceId);

      // First verify the appliance belongs to the user
      const applianceDoc = await getDoc(applianceRef);
      if (!applianceDoc.exists()) {
        throw new Error('Appliance not found');
      }

      const applianceData = applianceDoc.data();
      if (applianceData.userId !== userId) {
        throw new Error('Unauthorized: Appliance does not belong to this user');
      }

      // Delete the appliance
      await deleteDoc(applianceRef);
      console.log(`Appliance ${applianceId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting appliance:', error);
      throw error;
    }
  }

  // Get user's available devices (devices without appliances registered)
  async getUserAvailableDevices(userId: string): Promise<Device[]> {
    try {
      // Get all user devices
      const allUserDevices = await this.getUserDevices(userId);

      // Get all user appliances to find which devices are already used
      const userAppliances = await this.getUserAppliances(userId);
      const usedDeviceIds = new Set(userAppliances.map(appliance => appliance.deviceId));

      // Filter out devices that already have appliances
      const availableDevices = allUserDevices.filter(device => !usedDeviceIds.has(device.id));

      console.log('Available devices for registration:', {
        totalDevices: allUserDevices.length,
        usedDevices: usedDeviceIds.size,
        availableDevices: availableDevices.length,
        availableDeviceIds: availableDevices.map(d => d.id)
      });

      return availableDevices;
    } catch (error) {
      console.error('Error fetching available devices:', error);
      throw error;
    }
  }

  // Debug function to check Realtime Database structure
  async debugRealtimeDatabase() {
    try {
      const rootRef = ref(this.rtdb);
      const rootSnap = await get(rootRef);
      const rootVal = rootSnap.val();
      console.log('Realtime Database structure:', rootVal);
      
      // Also try to check specific paths that might contain sensor data
      const possiblePaths = ['sensorReadings', 'SensorReadings', 'sensor_readings', 'Sensor_Readings', 'devices', 'Devices'];
      
      for (const path of possiblePaths) {
        try {
          const pathRef = ref(this.rtdb, path);
          const pathSnap = await get(pathRef);
          const pathVal = pathSnap.val();
          if (pathVal) {
            console.log(`Path '${path}' contains:`, pathVal);
          }
        } catch (error) {
          console.log(`Path '${path}' not accessible`);
        }
      }
      return rootVal;
    } catch (error) {
      console.error('Error debugging Realtime Database:', error);
    }
  }
}

export const deviceService = new DeviceService();
