import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SensorReadingModel } from '../../../models/SensorReading';

interface AppliancesListProps {
  userAppliances: any[];
  userDevices: any[];
  sensors: { [key: string]: SensorReadingModel };
  onAppliancePress: (appliance: any) => void;
  onApplianceToggle: (appliance: any, device: any, value: boolean) => void;
}

const AppliancesList: React.FC<AppliancesListProps> = ({
  userAppliances,
  userDevices,
  sensors,
  onAppliancePress,
  onApplianceToggle,
}) => {
  if (userAppliances.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Appliances Found</Text>
        <Text style={styles.emptyText}>
          You haven't registered any appliances yet. Go to the Appliances screen to add your first appliance.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>My Appliances</Text>
      
      {userAppliances.map((appliance) => {
        const device = userDevices.find(d => d.id === appliance.deviceId);
        const sensorData = device ? sensors[Object.keys(sensors).find(key => 
          sensors[key].serialNumber === device.serialNumber
        ) || ''] : null;
        
        return (
          <TouchableOpacity 
            key={appliance.id} 
            style={styles.applianceCard}
            onPress={() => onAppliancePress(appliance)}
            activeOpacity={0.7}
          >
            <View style={styles.applianceHeader}>
              <Text style={styles.applianceIcon}>{appliance.icon}</Text>
              <View style={styles.applianceInfo}>
                <Text style={styles.applianceName}>{appliance.name}</Text>
                <Text style={styles.applianceGroup}>{appliance.group}</Text>
                {device && (
                  <Text style={styles.deviceInfo}>
                    {device.name} ({device.serialNumber})
                  </Text>
                )}
                {sensorData && (
                  <>
                    <Text style={styles.runtimeInfo}>
                      Runtime: {sensorData.getFormattedRuntime()}
                    </Text>
                    <Text style={styles.energyInfo}>
                      Energy: {(sensorData.energy || 0).toFixed(3)} kWh
                    </Text>
                  </>
                )}
              </View>
              
              <View style={styles.switchContainer}>
                <Text style={[
                  styles.switchStatus,
                  { color: sensorData?.applianceState ? '#5B934E' : '#999' }
                ]}>
                  {sensorData?.applianceState ? 'ON' : 'OFF'}
                </Text>
                <Switch
                  value={sensorData?.applianceState || false}
                  onValueChange={(value) => onApplianceToggle(appliance, device, value)}
                  trackColor={{ false: '#E0E0E0', true: '#5B934E' }}
                  thumbColor={sensorData?.applianceState ? '#FFFFFF' : '#FFFFFF'}
                  ios_backgroundColor="#E0E0E0"
                />
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
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  applianceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applianceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  applianceIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  applianceInfo: {
    flex: 1,
  },
  applianceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  applianceGroup: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  deviceInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  runtimeInfo: {
    fontSize: 12,
    color: '#5B934E',
    marginTop: 2,
    fontWeight: '500',
  },
  energyInfo: {
    fontSize: 12,
    color: '#E67E22',
    marginTop: 2,
    fontWeight: '500',
  },
  switchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  switchStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  limitInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  limitText: {
    fontSize: 12,
    color: '#666',
  },
});

export default AppliancesList;
