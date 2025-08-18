import { ref, onValue, DataSnapshot, update, get } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import { SensorReading, SensorReadingModel } from '../../models/SensorReading';

export class SensorService {
  private listeners: { [key: string]: () => void } = {};

  // Listen to a specific sensor reading
  listenToSensor(sensorId: string, callback: (data: SensorReadingModel | null) => void): () => void {
    // Handle the special case where the first sensor is just 'SensorReadings'
    const path = sensorId === '1' ? 'SensorReadings' : `SensorReadings_${sensorId}`;
    const sensorRef = ref(database, path);
    
    const unsubscribe = onValue(
      sensorRef,
      (snapshot: DataSnapshot) => {
        try {
          if (snapshot.exists()) {
            const data = snapshot.val() as SensorReading;
            const sensorReading = new SensorReadingModel(data);
            try {
              callback(sensorReading);
            } catch (cbErr) {
              console.error('Sensor callback error:', cbErr);
            }
          } else {
            try {
              callback(null);
            } catch (cbErr) {
              console.error('Sensor callback error (null):', cbErr);
            }
          }
        } catch (handlerErr) {
          console.error('Error handling sensor snapshot:', handlerErr);
        }
      },
      (error) => {
        console.error('Error listening to sensor:', error);
        try { callback(null); } catch {}
      }
    );

    this.listeners[sensorId] = unsubscribe;
    return unsubscribe;
  }

  // Listen to all sensor readings
  listenToAllSensors(callback: (sensors: { [key: string]: SensorReadingModel }) => void): () => void {
    const sensorsRef = ref(database, '/');
    
    const unsubscribe = onValue(
      sensorsRef,
      (snapshot: DataSnapshot) => {
        try {
          const sensors: { [key: string]: SensorReadingModel } = {};
          snapshot.forEach((childSnapshot) => {
            try {
              const sensorId = childSnapshot.key;
              if (sensorId) {
                let mappedId: string;
                // Map the Firebase keys to our internal IDs
                if (sensorId === 'SensorReadings') {
                  mappedId = 'SensorReadings_1';
                } else if (sensorId.startsWith('SensorReadings_')) {
                  mappedId = sensorId;
                } else {
                  return; // Skip other nodes
                }
                const data = childSnapshot.val() as SensorReading;
                sensors[mappedId] = new SensorReadingModel(data);
              }
            } catch (childErr) {
              console.warn('Error processing child snapshot:', childErr);
            }
          });
          try { callback(sensors); } catch (cbErr) { console.error('All sensors callback error:', cbErr); }
        } catch (handlerErr) {
          console.error('Error handling all sensors snapshot:', handlerErr);
        }
      },
      (error) => {
        console.error('Error listening to all sensors:', error);
        try { callback({}); } catch {}
      }
    );

    return unsubscribe;
  }

  // Stop listening to a specific sensor
  stopListeningToSensor(sensorId: string): void {
    if (this.listeners[sensorId]) {
      this.listeners[sensorId]();
      delete this.listeners[sensorId];
    }
  }

  // Stop listening to all sensors
  stopListeningToAllSensors(): void {
    Object.values(this.listeners).forEach(unsubscribe => unsubscribe());
    this.listeners = {};
  }

  // Update appliance state in the Realtime Database
  async updateApplianceState(sensorId: string, applianceState: boolean): Promise<void> {
    try {
      // Handle the special case where the first sensor is just 'SensorReadings'
      const path = sensorId === '1' ? 'SensorReadings' : `SensorReadings_${sensorId}`;
      const sensorRef = ref(database, path);

      console.log(`Attempting to update appliance state at path: ${path}, new state: ${applianceState}`);

      await update(sensorRef, {
        applianceState: applianceState
      });

      console.log(`Successfully updated appliance state for sensor ${sensorId} to ${applianceState}`);

      // Verify the update by reading the value back (use get to avoid callback rethrow issues)
      setTimeout(async () => {
        try {
          const snap = await get(sensorRef);
          if (snap.exists()) {
            const data = snap.val();
            console.log(`Verification: appliance state is now ${data.applianceState} at path ${path}`);
          }
        } catch (verifyError) {
          console.error('Error verifying update:', verifyError);
        }
      }, 1000);

    } catch (error) {
      console.error('Error updating appliance state:', error);
      console.error('Error details:', error);
      throw error;
    }
  }

  // Get sensor data once (not real-time)
  async getSensorData(sensorId: string): Promise<SensorReadingModel | null> {
    try {
      const path = sensorId === '1' ? 'SensorReadings' : `SensorReadings_${sensorId}`;
      const sensorRef = ref(database, path);
      const snapshot = await get(sensorRef);
      if (snapshot.exists()) {
        const data = snapshot.val() as SensorReading;
        return new SensorReadingModel(data);
      }
      return null;
    } catch (error) {
      console.error('Error getting sensor data:', error);
      return null;
    }
  }

  // Get all sensor data once
  async getAllSensorData(): Promise<{ [key: string]: SensorReadingModel }> {
    try {
      const sensorsRef = ref(database, '/');
      const snapshot = await get(sensorsRef);
      const sensors: { [key: string]: SensorReadingModel } = {};
      snapshot.forEach((childSnapshot) => {
        try {
          const sensorId = childSnapshot.key;
          if (sensorId) {
            let mappedId: string;
            if (sensorId === 'SensorReadings') {
              mappedId = 'SensorReadings_1';
            } else if (sensorId.startsWith('SensorReadings_')) {
              mappedId = sensorId;
            } else {
              return; // Skip other nodes
            }
            const data = childSnapshot.val() as SensorReading;
            sensors[mappedId] = new SensorReadingModel(data);
          }
        } catch (childErr) {
          console.warn('Error processing child snapshot (all):', childErr);
        }
      });
      return sensors;
    } catch (error) {
      console.error('Error getting all sensor data:', error);
      return {};
    }
  }
}

export const sensorService = new SensorService();
