import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Appliance } from '../managers/AppliancesDataManager';

interface Props {
  appliance: Appliance;
  isSelectionMode: boolean;
  selected: boolean;
  onSelectToggle: () => void;
  onDelete: () => void;
  status: { isConnected: boolean; applianceState: boolean };
  sensorDataForDevice: any;
  onToggleAppliance: () => void;
  isHighlighted: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const ApplianceCard: React.FC<Props> = ({
  appliance,
  isSelectionMode,
  selected,
  onSelectToggle,
  onDelete,
  status,
  sensorDataForDevice,
  onToggleAppliance,
  isHighlighted,
  isExpanded,
  onToggleExpand,
}) => {
  // Helper function to format runtime from plain sensor data object
  const formatRuntime = (sensorData: any): string => {
    if (!sensorData) return '0h 0m 0s';
    const hours = sensorData.runtimehr || 0;
    const minutes = sensorData.runtimemin || 0;
    const seconds = sensorData.runtimesec || 0;
    return `${hours}h ${minutes}m ${seconds}s`;
  };
  return (
    <View style={[styles.applianceCard, isHighlighted && styles.highlightedCard]}>
      <View style={styles.applianceHeader}>
        {isSelectionMode && (
          <TouchableOpacity style={styles.checkbox} onPress={onSelectToggle}>
            <View style={[styles.checkboxInner, selected && styles.checkboxSelected]}>
              {selected && <Text style={styles.checkboxText}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
        <Text style={styles.applianceIcon}>{appliance.icon}</Text>
        <View style={styles.applianceInfo}>
          <Text style={styles.applianceName}>{appliance.name}</Text>
          <Text style={styles.applianceGroup}>{appliance.group}</Text>
          <Text style={styles.deviceInfo}>
            Device: {appliance.deviceName} ({appliance.deviceSerialNumber})
          </Text>
          <Text style={styles.energyInfo}>Energy: {sensorDataForDevice?.energy?.toFixed(3) || '0.000'} kWh</Text>
        </View>
        {!isSelectionMode && (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

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
          {appliance.maxKWh && (
            <View style={styles.runtimeRow}>
              <Text style={styles.runtimeLabel}>Max kWh:</Text>
              <Text style={styles.runtimeValue}>{appliance.maxKWh} kWh</Text>
              {!appliance.maxRuntime && (
                <Text style={[styles.statusBadge, {
                  backgroundColor: status.applianceState ? '#E8F5E8' : '#FFEBEE',
                  color: status.applianceState ? '#2E7D32' : '#C62828'
                }]}>
                  {status.applianceState ? 'ON' : 'OFF'}
                </Text>
              )}
              {appliance.maxRuntime && <View style={styles.spacer} />}
            </View>
          )}
          <View style={styles.runtimeRow}>
            <Text style={styles.runtimeLabel}>Actual Runtime:</Text>
            <Text style={styles.runtimeValue}>{formatRuntime(sensorDataForDevice)}</Text>
            <Switch
              value={status.applianceState}
              onValueChange={onToggleAppliance}
              trackColor={{ false: '#FFCDD2', true: '#C8E6C9' }}
              thumbColor={status.applianceState ? '#4CAF50' : '#F44336'}
              style={styles.switch}
            />
          </View>
        </View>
      </View>

      <View style={styles.sensorSection}>
        <TouchableOpacity style={styles.viewSensorsButton} onPress={onToggleExpand}>
          <Text style={styles.viewSensorsText}>{isExpanded ? 'Hide Sensors' : 'View Sensors'}</Text>
          <Text style={styles.viewSensorsIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && sensorDataForDevice && (
          <View style={styles.sensorDataContainer}>
            <View style={styles.sensorDataRow}>
              <View style={styles.sensorDataItem}>
                <Text style={styles.sensorDataLabel}>Power</Text>
                <Text style={styles.sensorDataValue}>{sensorDataForDevice.power?.toFixed(2) || '0.00'} W</Text>
              </View>
              <View style={styles.sensorDataItem}>
                <Text style={styles.sensorDataLabel}>Voltage</Text>
                <Text style={styles.sensorDataValue}>{sensorDataForDevice.voltage?.toFixed(1) || '0.0'} V</Text>
              </View>
              <View style={styles.sensorDataItem}>
                <Text style={styles.sensorDataLabel}>Current</Text>
                <Text style={styles.sensorDataValue}>{sensorDataForDevice.current?.toFixed(2) || '0.00'} A</Text>
              </View>
            </View>

            <View style={styles.sensorDataRow}>
              <View style={styles.sensorDataItem}>
                <Text style={styles.sensorDataLabel}>State</Text>
                <Text style={[styles.sensorDataValue, { color: sensorDataForDevice.applianceState ? '#5B934E' : '#F44336' }]}>
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

const styles = StyleSheet.create({
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
  highlightedCard: {
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#5B934E',
    shadowColor: '#5B934E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  applianceHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  checkbox: { marginRight: 8 },
  checkboxInner: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#CCCCCC', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#5B934E', borderColor: '#5B934E' },
  checkboxText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  applianceIcon: { fontSize: 32, marginRight: 12 },
  applianceInfo: { flex: 1 },
  applianceName: { fontSize: 18, fontWeight: 'bold', color: '#333333', marginBottom: 4 },
  applianceGroup: { fontSize: 14, color: '#666666', marginBottom: 4 },
  deviceInfo: { fontSize: 12, color: '#999999' },
  energyInfo: { fontSize: 12, color: '#5B934E', fontWeight: '600', marginTop: 2 },
  deleteButton: { padding: 8, borderRadius: 20, backgroundColor: '#FFEBEE' },
  deleteIcon: { fontSize: 16, color: '#F44336', fontWeight: 'bold' },
  runtimeContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  runtimeInfo: { },
  runtimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  runtimeLabel: { fontSize: 14, color: '#666666', fontWeight: '500', flex: 1 },
  runtimeValue: { fontSize: 14, color: '#333333', fontWeight: '600', flex: 2, textAlign: 'left', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontSize: 12 },
  spacer: { flex: 1 },
  switch: { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] },
  sensorSection: { marginTop: 12 },
  viewSensorsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  viewSensorsText: { fontSize: 14, color: '#467933', fontWeight: 'bold' },
  viewSensorsIcon: { fontSize: 14, color: '#467933' },
  sensorDataContainer: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 16, marginTop: 8 },
  sensorDataRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sensorDataItem: { flex: 1, alignItems: 'center' },
  sensorDataLabel: { fontSize: 12, color: '#666666', marginBottom: 4 },
  sensorDataValue: { fontSize: 14, color: '#333333' },
  noSensorDataContainer: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 16, marginTop: 8, alignItems: 'center' },
  noSensorDataText: { fontSize: 14, color: '#666666', fontStyle: 'italic' },
});

export default ApplianceCard;
