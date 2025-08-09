import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { getDatabase, ref, onValue, off } from 'firebase/database';
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
          const rootData = snapshot.val();
          console.log('Root level data:', rootData);
          
          if (rootData) {
            // Search recursively through all data
            const findDeviceInData = (data: any, path: string = ''): any => {
              if (!data || typeof data !== 'object') return null;
              
              // Check if this object has the serialNumber we're looking for
              if (data.serialNumber === serialNumber) {
                console.log(`Found device at path: ${path}`, data);
                return data;
              }
              
              // Search through all properties
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
              
              console.log(`Device ${serialNumber} found at root level:`, {
                applianceState,
                hasRecentData,
                isConnected,
                foundDevice
              });
              
              callback(isConnected, applianceState);
            } else {
              console.log(`Device ${serialNumber} not found anywhere in Realtime Database`);
              callback(false, false);
            }
          } else {
            console.log('No data found at root level');
            callback(false, false);
          }
        });
        
        return;
      }
      
      const path = possiblePaths[pathIndex];
      const allSensorReadingsRef = ref(this.rtdb, path);
      
      unsubscribe = onValue(allSensorReadingsRef, (snapshot) => {
        const allData = snapshot.val();
        console.log(`Checking path '${path}':`, allData);
        
        if (allData) {
          // Search through all sensorReadings for the device with matching serialNumber
          let foundDevice = null;
          Object.keys(allData).forEach(key => {
            const deviceData = allData[key];
            if (deviceData && deviceData.serialNumber === serialNumber) {
              foundDevice = deviceData;
            }
          });
          
          if (foundDevice) {
            const applianceState = foundDevice.applianceState || false;
            const hasRecentData = foundDevice.timestamp ? (Date.now() - foundDevice.timestamp) < 30000 : false;
            const isConnected = applianceState || hasRecentData;
            
            console.log(`Device ${serialNumber} connection status:`, {
              applianceState,
              hasRecentData,
              isConnected,
              foundDevice
            });
            
            callback(isConnected, applianceState);
          } else {
            console.log(`Device ${serialNumber} not found in ${path}, trying next path...`);
            tryPath(pathIndex + 1);
          }
        } else {
          console.log(`No data found in ${path}, trying next path...`);
          tryPath(pathIndex + 1);
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

  // Debug function to check Realtime Database structure
  async debugRealtimeDatabase() {
    try {
      const rootRef = ref(this.rtdb);
      const snapshot = await new Promise((resolve) => {
        onValue(rootRef, (snapshot) => {
          resolve(snapshot.val());
        }, { onlyOnce: true });
      });
      
      console.log('Realtime Database structure:', snapshot);
      
      // Also try to check specific paths that might contain sensor data
      const possiblePaths = ['sensorReadings', 'SensorReadings', 'sensor_readings', 'Sensor_Readings', 'devices', 'Devices'];
      
      for (const path of possiblePaths) {
        try {
          const pathRef = ref(this.rtdb, path);
          const pathSnapshot = await new Promise((resolve) => {
            onValue(pathRef, (snapshot) => {
              resolve(snapshot.val());
            }, { onlyOnce: true });
          });
          
          if (pathSnapshot) {
            console.log(`Path '${path}' contains:`, pathSnapshot);
          }
        } catch (error) {
          console.log(`Path '${path}' not accessible`);
        }
      }
      
      return snapshot;
    } catch (error) {
      console.error('Error debugging Realtime Database:', error);
    }
  }
}

export const deviceService = new DeviceService();
