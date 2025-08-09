import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { deviceService } from '../../services/devices/deviceService';
import { sensorService } from '../../services/sensors/sensorService';
import { getAuth } from 'firebase/auth';
import ApplianceRegistrationModal from '../../components/appliances/ApplianceRegistrationModal';

interface Appliance {
  id: string;
  name: string;
  icon: string;
  group: string;
  deviceId: string;
  deviceName?: string;
  deviceSerialNumber?: string;
  isActive: boolean;
  createdAt: Date;
  maxRuntime?: {
    value: number;
    unit: string;
  };
  maxKWh?: number;
  notificationsEnabled: boolean;
}

const AppliancesScreen: React.FC = () => {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deviceStatuses, setDeviceStatuses] = useState<{
    [deviceId: string]: { isConnected: boolean; applianceState: boolean };
  }>({});
  const [sensorData, setSensorData] = useState<{[serialNumber: string]: any}>({});
  const [expandedSensors, setExpandedSensors] = useState<{[applianceId: string]: boolean}>({});
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Map device serial numbers to sensor IDs
  const getSerialNumberToSensorIdMapping = (): { [serialNumber: string]: string } => {
    return {
      '11032401': '1',
      '11032402': '2', 
      '11032403': '3',
      // Add more mappings as needed
    };
  };

  useEffect(() => {
    if (currentUser) {
      loadAppliances();
    }
  }, [currentUser]);

  const loadAppliances = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      console.log('Loading appliances for user:', currentUser.uid);
      
      // Get user's appliances
      const userAppliances = await deviceService.getUserAppliances(currentUser.uid);
      console.log('Loaded appliances:', userAppliances);

      // Get user's devices to match with appliances
      const userDevices = await deviceService.getUserDevices(currentUser.uid);
      
      // Combine appliance data with device information
      const appliancesWithDeviceInfo = userAppliances.map(appliance => {
        const device = userDevices.find(d => d.id === appliance.deviceId);
        return {
          ...appliance,
          deviceName: device?.name || 'Unknown Device',
          deviceSerialNumber: device?.serialNumber || 'Unknown',
        };
      });

      setAppliances(appliancesWithDeviceInfo);

      // Set up real-time listeners for device status and sensor data
      const unsubscribers: (() => void)[] = [];
      const serialToSensorMapping = getSerialNumberToSensorIdMapping();
      
      userDevices.forEach(device => {
        // Listen to device connection status
        const connectionUnsubscribe = deviceService.listenToDeviceConnection(
          device.serialNumber,
          (isConnected, applianceState) => {
            setDeviceStatuses(prev => ({
              ...prev,
              [device.id]: { isConnected, applianceState }
            }));
          }
        );
        unsubscribers.push(connectionUnsubscribe);

        // Listen to sensor data for this device
        const sensorId = serialToSensorMapping[device.serialNumber];
        if (sensorId) {
          console.log(`Setting up sensor listener for device ${device.serialNumber} -> sensor ID ${sensorId}`);
          const sensorUnsubscribe = sensorService.listenToSensor(
            sensorId,
            (data) => {
              console.log(`Received sensor data for device ${device.serialNumber}:`, data);
              setSensorData(prev => ({
                ...prev,
                [device.serialNumber]: data
              }));
            }
          );
          unsubscribers.push(sensorUnsubscribe);
        } else {
          console.warn(`No sensor ID mapping found for device serial number: ${device.serialNumber}`);
        }
      });

      return () => {
        unsubscribers.forEach(unsubscribe => unsubscribe());
      };
    } catch (error) {
      console.error('Error loading appliances:', error);
      Alert.alert('Error', 'Failed to load appliances');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppliances();
    setRefreshing(false);
  };

  const getApplianceStatus = (appliance: Appliance) => {
    const deviceStatus = deviceStatuses[appliance.deviceId];
    if (!deviceStatus) return { isConnected: false, applianceState: false };
    return deviceStatus;
  };

  const toggleSensorView = (applianceId: string) => {
    setExpandedSensors(prev => ({
      ...prev,
      [applianceId]: !prev[applianceId]
    }));
  };

  const toggleApplianceState = async (appliance: Appliance) => {
    try {
      const serialToSensorMapping = getSerialNumberToSensorIdMapping();
      const sensorId = serialToSensorMapping[appliance.deviceSerialNumber || ''];
      
      console.log('Toggle attempt details:', {
        applianceName: appliance.name,
        deviceSerialNumber: appliance.deviceSerialNumber,
        sensorId,
        serialToSensorMapping,
        deviceStatuses: deviceStatuses[appliance.deviceId]
      });
      
      if (!sensorId) {
        console.error(`No sensor ID found for device serial: ${appliance.deviceSerialNumber}`);
        Alert.alert('Error', `Cannot find sensor ID for device ${appliance.deviceSerialNumber}`);
        return;
      }

      const currentState = deviceStatuses[appliance.deviceId]?.applianceState || false;
      const newState = !currentState;
      
      console.log(`Toggling appliance ${appliance.name} (device: ${appliance.deviceSerialNumber}, sensor: ${sensorId}) from ${currentState} to ${newState}`);
      
      // Update the appliance state in the Realtime Database
      await sensorService.updateApplianceState(sensorId, newState);
      
      // Temporarily update the local state to provide immediate UI feedback
      setDeviceStatuses(prev => ({
        ...prev,
        [appliance.deviceId]: {
          ...prev[appliance.deviceId],
          applianceState: newState
        }
      }));
      
      console.log(`Successfully updated appliance state for ${appliance.name}`);
    } catch (error) {
      console.error('Error toggling appliance state:', error);
      console.error('Error details:', error);
      Alert.alert('Error', `Failed to toggle appliance state: ${error.message}`);
    }
  };

  const renderApplianceCard = (appliance: Appliance) => {
    const status = getApplianceStatus(appliance);
    const isExpanded = expandedSensors[appliance.id] || false;
    const sensorDataForDevice = sensorData[appliance.deviceSerialNumber || ''];
    
    // Debug logging
    if (isExpanded) {
      console.log(`Rendering appliance card for ${appliance.name}:`, {
        applianceId: appliance.id,
        deviceSerialNumber: appliance.deviceSerialNumber,
        sensorDataKeys: Object.keys(sensorData),
        sensorDataForDevice,
        isExpanded
      });
    }
    
    return (
      <View key={appliance.id} style={styles.applianceCard}>
        <View style={styles.applianceHeader}>
          <Text style={styles.applianceIcon}>{appliance.icon}</Text>
          <View style={styles.applianceInfo}>
            <Text style={styles.applianceName}>{appliance.name}</Text>
            <Text style={styles.applianceGroup}>{appliance.group}</Text>
            <Text style={styles.deviceInfo}>
              Device: {appliance.deviceName} ({appliance.deviceSerialNumber})
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: status.isConnected ? '#5B934E' : '#F44336' }
            ]} />
            <Text style={styles.statusText}>
              {status.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>
        
        {/* Runtime Control Container */}
        <View style={styles.runtimeContainer}>
          <View style={styles.runtimeInfo}>
            {appliance.maxRuntime && (
              <View style={styles.runtimeRow}>
                <Text style={styles.runtimeLabel}>Max Runtime:</Text>
                <Text style={styles.runtimeValue}>
                  {appliance.maxRuntime.value} {appliance.maxRuntime.unit}
                </Text>
                <Text style={[styles.statusBadge, { 
                  backgroundColor: status.applianceState ? '#E8F5E8' : '#FFEBEE',
                  color: status.applianceState ? '#2E7D32' : '#C62828'
                }]}>
                  {status.applianceState ? 'ON' : 'OFF'}
                </Text>
              </View>
            )}
            <View style={styles.runtimeRow}>
              <Text style={styles.runtimeLabel}>Actual Runtime:</Text>
              <Text style={styles.runtimeValue}>
                {sensorDataForDevice?.getFormattedRuntime?.() || '0h 0m 0s'}
              </Text>
              <Switch
                value={status.applianceState}
                onValueChange={() => toggleApplianceState(appliance)}
                trackColor={{ false: '#FFCDD2', true: '#C8E6C9' }}
                thumbColor={status.applianceState ? '#4CAF50' : '#F44336'}
                style={styles.switch}
              />
            </View>
          </View>
        </View>

        {appliance.maxKWh && (
          <View style={styles.limitInfo}>
            <Text style={styles.limitText}>
              Max kWh: {appliance.maxKWh} kWh
            </Text>
          </View>
        )}

        {/* Sensor Data Section */}
        <View style={styles.sensorSection}>
          <TouchableOpacity
            style={styles.viewSensorsButton}
            onPress={() => toggleSensorView(appliance.id)}
          >
            <Text style={styles.viewSensorsText}>
              {isExpanded ? 'Hide Sensors' : 'View Sensors'}
            </Text>
            <Text style={styles.viewSensorsIcon}>
              {isExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {isExpanded && sensorDataForDevice && (
            <View style={styles.sensorDataContainer}>
              <View style={styles.sensorDataRow}>
                <View style={styles.sensorDataItem}>
                  <Text style={styles.sensorDataLabel}>Power</Text>
                  <Text style={styles.sensorDataValue}>
                    {sensorDataForDevice.power?.toFixed(2) || '0.00'} W
                  </Text>
                </View>
                <View style={styles.sensorDataItem}>
                  <Text style={styles.sensorDataLabel}>Voltage</Text>
                  <Text style={styles.sensorDataValue}>
                    {sensorDataForDevice.voltage?.toFixed(1) || '0.0'} V
                  </Text>
                </View>
                <View style={styles.sensorDataItem}>
                  <Text style={styles.sensorDataLabel}>Current</Text>
                  <Text style={styles.sensorDataValue}>
                    {sensorDataForDevice.current?.toFixed(2) || '0.00'} A
                  </Text>
                </View>
              </View>

              <View style={styles.sensorDataRow}>
                <View style={styles.sensorDataItem}>
                  <Text style={styles.sensorDataLabel}>Energy</Text>
                  <Text style={styles.sensorDataValue}>
                    {sensorDataForDevice.energy?.toFixed(3) || '0.000'} kWh
                  </Text>
                </View>
                <View style={styles.sensorDataItem}>
                  <Text style={styles.sensorDataLabel}>State</Text>
                  <Text style={[
                    styles.sensorDataValue,
                    { color: sensorDataForDevice.applianceState ? '#5B934E' : '#F44336' }
                  ]}>
                    {sensorDataForDevice.applianceState ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {isExpanded && !sensorDataForDevice && (
            <View style={styles.noSensorDataContainer}>
              <Text style={styles.noSensorDataText}>No sensor data available</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B934E" />
        <Text style={styles.loadingText}>Loading appliances...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>My Appliances</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowRegistrationModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add Appliance</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {appliances.length} appliance{appliances.length !== 1 ? 's' : ''} registered
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {appliances.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Appliances Found</Text>
            <Text style={styles.emptyText}>
              You haven't registered any appliances yet. Go to the registration modal to add your first appliance.
            </Text>
          </View>
        ) : (
          appliances.map(renderApplianceCard)
        )}
      </ScrollView>

      {/* Appliance Registration Modal */}
      <ApplianceRegistrationModal
        visible={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onSuccess={() => {
          setShowRegistrationModal(false);
          loadAppliances(); // Reload appliances after successful registration
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  addButton: {
    backgroundColor: '#5B934E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  applianceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applianceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  applianceIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  applianceInfo: {
    flex: 1,
  },
  applianceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  applianceGroup: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  deviceInfo: {
    fontSize: 12,
    color: '#999999',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666666',
  },
  limitInfo: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginTop: 8,
  },
  limitText: {
    fontSize: 14,
    color: '#467933',
  },
  runtimeContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  runtimeInfo: {
    gap: 12,
  },
  runtimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  runtimeLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    flex: 1,
  },
  runtimeValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'left',
    marginLeft: 8,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
    minWidth: 40,
  },
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  sensorSection: {
    marginTop: 12,
  },
  viewSensorsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  viewSensorsText: {
    fontSize: 14,
    color: '#467933',
    fontWeight: 'bold',
  },
  viewSensorsIcon: {
    fontSize: 14,
    color: '#467933',
  },
  sensorDataContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  sensorDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sensorDataItem: {
    flex: 1,
    alignItems: 'center',
  },
  sensorDataLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  sensorDataValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  noSensorDataContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  noSensorDataText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
});

export default AppliancesScreen;
