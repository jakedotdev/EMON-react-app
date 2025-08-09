import { getFirestore, collection, doc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { Device } from '../../models/Device';

class AdminService {
  private db = getFirestore();

  // Activate a device for a specific user (admin function)
  async activateDeviceForUser(serialNumber: string, userId: string, deviceName: string): Promise<void> {
    try {
      const deviceRef = doc(collection(this.db, 'devices'));
      await setDoc(deviceRef, {
        serialNumber,
        name: deviceName,
        userId,
        isActivated: true,
        isConnected: false,
        applianceState: false,
        createdAt: new Date(),
        activatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error activating device:', error);
      throw error;
    }
  }

  // Get all devices for admin management
  async getAllDevices(): Promise<Device[]> {
    try {
      const devicesRef = collection(this.db, 'devices');
      const querySnapshot = await getDocs(devicesRef);
      
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
      console.error('Error fetching all devices:', error);
      throw error;
    }
  }

  // Get devices by user ID
  async getDevicesByUser(userId: string): Promise<Device[]> {
    try {
      const devicesRef = collection(this.db, 'devices');
      const q = query(devicesRef, where('userId', '==', userId));
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
      console.error('Error fetching devices by user:', error);
      throw error;
    }
  }

  // Deactivate a device
  async deactivateDevice(deviceId: string): Promise<void> {
    try {
      const deviceRef = doc(this.db, 'devices', deviceId);
      await updateDoc(deviceRef, {
        isActivated: false,
        deactivatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error deactivating device:', error);
      throw error;
    }
  }

  // Transfer device to another user
  async transferDevice(deviceId: string, newUserId: string): Promise<void> {
    try {
      const deviceRef = doc(this.db, 'devices', deviceId);
      await updateDoc(deviceRef, {
        userId: newUserId,
        transferredAt: new Date(),
      });
    } catch (error) {
      console.error('Error transferring device:', error);
      throw error;
    }
  }



              // Update existing device to new user ID
              async updateDeviceUserId(deviceId: string, newUserId: string): Promise<void> {
                try {
                  const deviceRef = doc(this.db, 'devices', deviceId);
                  await updateDoc(deviceRef, {
                    userId: newUserId,
                    lastUpdated: new Date(),
                  });
                  console.log(`Device ${deviceId} updated to user ${newUserId}`);
                } catch (error) {
                  console.error('Error updating device user ID:', error);
                  throw error;
                }
              }

              // Update all existing devices to current user
              async updateAllDevicesToCurrentUser(newUserId: string): Promise<void> {
                try {
                  const devicesRef = collection(this.db, 'devices');
                  const querySnapshot = await getDocs(devicesRef);
                  
                  const updatePromises = querySnapshot.docs.map(doc => {
                    return updateDoc(doc.ref, {
                      userId: newUserId,
                      lastUpdated: new Date(),
                    });
                  });
                  
                  await Promise.all(updatePromises);
                  console.log(`Updated ${querySnapshot.docs.length} devices to user ${newUserId}`);
                } catch (error) {
                  console.error('Error updating all devices:', error);
                  throw error;
                }
              }

              // Activate multiple devices for development
              async activateDevelopmentDevices(userId: string): Promise<void> {
                try {
                  const devices = [
                    { serialNumber: '11032401', name: 'Device 1' },
                    { serialNumber: '11032402', name: 'Device 2' },
                    { serialNumber: '11032403', name: 'Device 3' },
                  ];

                  const activationPromises = devices.map(device => 
                    this.activateDeviceForUser(device.serialNumber, userId, device.name)
                  );

                  await Promise.all(activationPromises);
                  console.log(`Activated ${devices.length} development devices for user ${userId}`);
                } catch (error) {
                  console.error('Error activating development devices:', error);
                  throw error;
                }
              }
}

export const adminService = new AdminService();
