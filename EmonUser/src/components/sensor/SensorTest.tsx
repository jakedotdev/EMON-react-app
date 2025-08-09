import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { sensorService } from '../../services/sensors/sensorService';
import { SensorReadingModel } from '../../models/SensorReading';

const SensorTest: React.FC = () => {
  const [sensors, setSensors] = useState<{ [key: string]: SensorReadingModel }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen to all sensors in real-time
    const unsubscribe = sensorService.listenToAllSensors((sensorData) => {
      setSensors(sensorData);
      setLoading(false);
      setError(null);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const getDeviceName = (sensorId: string, serialNumber: string): string => {
    // Map serial numbers to device names
    const deviceNames: { [key: string]: string } = {
      '11032401': 'Device 1',
      '11032402': 'Device 2', 
      '11032403': 'Device 3'
    };
    
    return deviceNames[serialNumber] || `Device ${sensorId}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading sensor data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>EMON IoT Sensor Data</Text>
      {Object.keys(sensors).length === 0 ? (
        <Text style={styles.noDataText}>No sensor data available</Text>
      ) : (
        Object.entries(sensors).map(([sensorId, sensor]) => (
          <View key={sensorId} style={styles.sensorCard}>
            <Text style={styles.sensorId}>
              {getDeviceName(sensorId, sensor.serialNumber)}
            </Text>
            <Text style={styles.serialNumber}>
              Serial: {sensor.serialNumber}
            </Text>
            <View style={styles.dataRow}>
              <View style={styles.dataColumn}>
                <Text style={styles.dataLabel}>Power</Text>
                <Text style={styles.dataValue}>{sensor.power.toFixed(2)}W</Text>
              </View>
              <View style={styles.dataColumn}>
                <Text style={styles.dataLabel}>Voltage</Text>
                <Text style={styles.dataValue}>{sensor.voltage.toFixed(1)}V</Text>
              </View>
            </View>
            <View style={styles.dataRow}>
              <View style={styles.dataColumn}>
                <Text style={styles.dataLabel}>Current</Text>
                <Text style={styles.dataValue}>{sensor.current.toFixed(2)}A</Text>
              </View>
              <View style={styles.dataColumn}>
                <Text style={styles.dataLabel}>Energy</Text>
                <Text style={styles.dataValue}>{sensor.energy.toFixed(3)}kWh</Text>
              </View>
            </View>
            {sensor.dailyEnergy > 0 && (
              <View style={styles.dataRow}>
                <View style={styles.dataColumn}>
                  <Text style={styles.dataLabel}>Daily Energy</Text>
                  <Text style={styles.dataValue}>{sensor.dailyEnergy.toFixed(2)}kWh</Text>
                </View>
              </View>
            )}
            <View style={styles.dataRow}>
              <View style={styles.dataColumn}>
                <Text style={styles.dataLabel}>State</Text>
                <Text style={[styles.dataValue, { color: sensor.applianceState ? '#4CAF50' : '#F44336' }]}>
                  {sensor.applianceState ? 'ON' : 'OFF'}
                </Text>
              </View>
              <View style={styles.dataColumn}>
                <Text style={styles.dataLabel}>Status</Text>
                <Text style={[styles.dataValue, { color: sensor.isOnline() ? '#4CAF50' : '#F44336' }]}>
                  {sensor.isOnline() ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
            <View style={styles.dataRow}>
              <View style={styles.dataColumn}>
                <Text style={styles.dataLabel}>Runtime</Text>
                <Text style={styles.dataValue}>{sensor.getFormattedRuntime()}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: 'red',
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  sensorCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sensorId: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  serialNumber: {
    fontSize: 14,
    marginBottom: 15,
    color: '#666',
    fontStyle: 'italic',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dataColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default SensorTest;
