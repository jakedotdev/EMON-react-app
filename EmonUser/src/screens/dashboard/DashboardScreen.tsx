import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { sensorService } from '../../services/sensors/sensorService';
import { authService } from '../../services/auth/authService';
import { deviceService } from '../../services/devices/deviceService';
import { SensorReadingModel } from '../../models/SensorReading';
import { getAuth } from 'firebase/auth';

type TimePeriod = 'Realtime' | 'Daily' | 'Weekly' | 'Monthly';


const DashboardScreen: React.FC = () => {
  const [sensors, setSensors] = useState<{ [key: string]: SensorReadingModel }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Realtime');
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [totalPower, setTotalPower] = useState(0);
  const [onlineDevices, setOnlineDevices] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userAppliances, setUserAppliances] = useState<any[]>([]);
  const [userDevices, setUserDevices] = useState<any[]>([]);

  const timePeriods: TimePeriod[] = ['Realtime', 'Daily', 'Weekly', 'Monthly'];

  useEffect(() => {
    loadSensorData();
    loadUserData();

    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Reload appliance data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        loadUserData();
      }
    }, [])
  );

  const loadUserData = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      try {
        const [appliances, devices] = await Promise.all([
          deviceService.getUserAppliances(currentUser.uid),
          deviceService.getUserDevices(currentUser.uid)
        ]);
        
        setUserAppliances(appliances);
        setUserDevices(devices);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
  };

  const loadSensorData = () => {
    const unsubscribe = sensorService.listenToAllSensors((sensorData) => {
      setSensors(sensorData);
      setLoading(false);
      
      // Calculate totals
      let energy = 0;
      let power = 0;
      let online = 0;
      
      Object.values(sensorData).forEach((sensor) => {
        energy += sensor.energy;
        power += sensor.power;
        if (sensor.isOnline()) {
          online++;
        }
      });
      
      setTotalEnergy(energy);
      setTotalPower(power);
      setOnlineDevices(online);
    });

    return unsubscribe;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload both sensor data and user data (including appliances)
      const sensorData = await sensorService.getAllSensorData();
      setSensors(sensorData);

      // Reload user appliances and devices
      await loadUserData();

      // Recalculate totals
      let energy = 0;
      let power = 0;
      let online = 0;

      Object.values(sensorData).forEach((sensor) => {
        energy += sensor.energy;
        power += sensor.power;
        if (sensor.isOnline()) {
          online++;
        }
      });

      setTotalEnergy(energy);
      setTotalPower(power);
      setOnlineDevices(online);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const getDeviceName = (sensorId: string, serialNumber: string): string => {
    // Find the device in userDevices by serial number
    const device = userDevices.find(d => d.serialNumber === serialNumber);
    return device?.name || `Device ${serialNumber}`;
  };

  const renderGauge = () => {
    const maxEnergy = 100; // Maximum kWh for gauge
    const percentage = Math.min((totalEnergy / maxEnergy) * 100, 100);
    const angle = (percentage / 100) * 180; // 180 degrees for semi-circle
    
    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gauge}>
          <View style={styles.gaugeBackground} />
          <View style={[styles.gaugeFill, { transform: [{ rotate: `${angle}deg` }] }]} />
          <View style={styles.gaugeCenter}>
            <Text style={styles.gaugeValue}>{totalEnergy.toFixed(1)}</Text>
            <Text style={styles.gaugeUnit}>kWh</Text>
          </View>
        </View>
        <Text style={styles.gaugeLabel}>Total Energy Consumption</Text>
      </View>
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>EMON Dashboard</Text>
          <Text style={styles.dateTime}>{formatDate(currentTime)}</Text>
          <Text style={styles.dateTime}>{formatTime(currentTime)}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Time Period Selector */}
      <View style={styles.periodSelector}>
        {timePeriods.map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonSelected
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextSelected
            ]}>
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Energy</Text>
          <Text style={styles.summaryValue}>{totalEnergy.toFixed(2)} kWh</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Current Power</Text>
          <Text style={styles.summaryValue}>{totalPower.toFixed(1)} W</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Online Devices</Text>
          <Text style={styles.summaryValue}>{onlineDevices}</Text>
        </View>
      </View>

      {/* Energy Gauge */}
      {Object.keys(sensors).length > 0 && selectedPeriod === 'Realtime' && (
        <View style={styles.gaugeSection}>
          {renderGauge()}
        </View>
      )}

      {/* Energy Overview for other periods */}
      {Object.keys(sensors).length > 0 && selectedPeriod !== 'Realtime' && (
        <View style={styles.energyDisplayContainer}>
          <Text style={styles.sectionTitle}>{selectedPeriod} Energy Overview</Text>
          <View style={styles.energyGrid}>
            <View style={styles.energyCard}>
              <Text style={styles.energyLabel}>Total Power</Text>
              <Text style={styles.energyValue}>
                {Object.values(sensors).reduce((sum, sensor) => sum + sensor.power, 0).toFixed(1)}W
              </Text>
            </View>
            <View style={styles.energyCard}>
              <Text style={styles.energyLabel}>Total Energy</Text>
              <Text style={styles.energyValue}>
                {Object.values(sensors).reduce((sum, sensor) => sum + sensor.energy, 0).toFixed(3)} kWh
              </Text>
            </View>
          </View>
        </View>
      )}



      {/* Appliances Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Appliances</Text>
        {userAppliances.length === 0 ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No appliances registered</Text>
            <Text style={styles.noDataSubtext}>Register appliances in the Appliances tab</Text>
          </View>
        ) : (
          userAppliances.map((appliance) => {
            const device = userDevices.find(d => d.id === appliance.deviceId);
            return (
              <View key={appliance.id} style={styles.applianceCard}>
                <View style={styles.applianceHeader}>
                  <Text style={styles.applianceIcon}>{appliance.icon}</Text>
                  <View style={styles.applianceInfo}>
                    <Text style={styles.applianceName}>{appliance.name}</Text>
                    <Text style={styles.applianceGroup}>{appliance.group}</Text>
                    {device && (
                      <Text style={styles.deviceInfo}>
                        Device: {device.name} ({device.serialNumber})
                      </Text>
                    )}
                  </View>
                </View>
                
                {appliance.maxRuntime && (
                  <View style={styles.limitInfo}>
                    <Text style={styles.limitText}>
                      Max Runtime: {appliance.maxRuntime.value} {appliance.maxRuntime.unit}
                    </Text>
                  </View>
                )}
                
                {appliance.maxKWh && (
                  <View style={styles.limitInfo}>
                    <Text style={styles.limitText}>
                      Max kWh: {appliance.maxKWh} kWh
                    </Text>
                  </View>
                )}
  </View>
);
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D3E6BF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5B934E',
  },
  dateTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    color: '#5B934E',
    fontSize: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  periodButton: {
    flex: 1,
    backgroundColor: '#D3E6BF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonSelected: {
    backgroundColor: '#5B934E',
  },
  periodButtonText: {
    color: '#467933',
    fontWeight: 'bold',
  },
  periodButtonTextSelected: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
  },
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  deviceData: {
    gap: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dataItem: {
    flex: 1,
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  energyDisplayContainer: {
    padding: 20,
  },
  energyGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  energyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  energyLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  energyValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5B934E',
  },
  gaugeSection: {
    padding: 20,
  },
  gaugeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gauge: {
    width: 200,
    height: 120,
    position: 'relative',
    alignItems: 'center',
  },
  gaugeBackground: {
    width: 200,
    height: 100,
    borderRadius: 100,
    backgroundColor: '#D3E6BF',
    position: 'absolute',
    top: 0,
  },
  gaugeFill: {
    width: 200,
    height: 100,
    borderRadius: 100,
    backgroundColor: '#5B934E',
    position: 'absolute',
    top: 0,
    transform: [{ rotate: '0deg' }],
  },
  gaugeCenter: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5B934E',
  },
  gaugeUnit: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  gaugeLabel: {
    fontSize: 16,
    color: '#467933',
    marginTop: 15,
    fontWeight: 'bold',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  applianceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  applianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applianceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  applianceInfo: {
    flex: 1,
  },
  applianceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  applianceGroup: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deviceInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  limitInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  limitText: {
    fontSize: 12,
    color: '#467933',
  },
});

export default DashboardScreen;
