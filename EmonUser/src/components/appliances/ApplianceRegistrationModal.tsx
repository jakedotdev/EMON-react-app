import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { deviceService } from '../../services/devices/deviceService';
import { Device, ApplianceRegistration } from '../../models/Device';
import { getAuth } from 'firebase/auth';

interface ApplianceRegistrationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ApplianceRegistrationModal: React.FC<ApplianceRegistrationModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'device' | 'appliance'>('device');
  const [loading, setLoading] = useState(false);
  const [userDevices, setUserDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceConnectionStatus, setDeviceConnectionStatus] = useState<{
    isConnected: boolean;
    applianceState: boolean;
  }>({ isConnected: false, applianceState: false });

  // Track real-time status for all devices
  const [deviceStatuses, setDeviceStatuses] = useState<{
    [serialNumber: string]: { isConnected: boolean; applianceState: boolean };
  }>({});

  // Device Section Form
  const [deviceForm, setDeviceForm] = useState({
    serialNumber: '',
    deviceName: '',
  });

  // Appliance Section Form
  const [applianceForm, setApplianceForm] = useState({
    name: '',
    icon: '',
    group: '',
    maxRuntime: {
      enabled: false,
      value: '',
      unit: 'hours' as 'hours' | 'minutes' | 'seconds',
    },
    maxKWh: {
      enabled: false,
      value: '',
    },
    notificationsEnabled: true,
  });

  const [showIconSelector, setShowIconSelector] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (visible && currentUser) {
      loadUserDevices();
      // Debug the Realtime Database structure
      deviceService.debugRealtimeDatabase();
    }
  }, [visible, currentUser]);



  // Listen to all devices' connection status
  useEffect(() => {
    if (userDevices.length > 0) {
      const unsubscribers: (() => void)[] = [];
      
      userDevices.forEach(device => {
        const unsubscribe = deviceService.listenToDeviceConnection(
          device.serialNumber,
          (isConnected, applianceState) => {
            setDeviceStatuses(prev => ({
              ...prev,
              [device.serialNumber]: { isConnected, applianceState }
            }));
          }
        );
        unsubscribers.push(unsubscribe);
      });

      return () => {
        unsubscribers.forEach(unsubscribe => unsubscribe());
      };
    }
  }, [userDevices]);

  useEffect(() => {
    if (selectedDevice) {
      const unsubscribe = deviceService.listenToDeviceConnection(
        selectedDevice.serialNumber,
        (isConnected, applianceState) => {
          console.log('Device connection status updated:', {
            deviceId: selectedDevice.id,
            serialNumber: selectedDevice.serialNumber,
            isConnected,
            applianceState
          });
          setDeviceConnectionStatus({ isConnected, applianceState });
        }
      );

      return () => unsubscribe();
    }
  }, [selectedDevice]);

  const loadUserDevices = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      console.log('Loading available devices for user:', currentUser.uid);
      const devices = await deviceService.getUserAvailableDevices(currentUser.uid);
      console.log('Loaded available devices:', devices);
      setUserDevices(devices);

      // Only show devices that don't have appliances registered yet
      if (devices.length === 0) {
        console.log('No available devices found for user - all devices may already have appliances registered');
      }
    } catch (error) {
      console.error('Error loading available devices:', error);
      Alert.alert('Error', 'Failed to load available devices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceSelect = (device: Device) => {
    console.log('Selected device:', device);
    setSelectedDevice(device);
    setDeviceForm({
      serialNumber: device.serialNumber,
      deviceName: device.name,
    });
  };

  const handleNextStep = () => {
    if (!selectedDevice) {
      Alert.alert('Error', 'Please select a device first');
      return;
    }

    const deviceStatus = deviceStatuses[selectedDevice.serialNumber];
    if (!deviceStatus?.isConnected) {
      Alert.alert(
        'Device Not Connected',
        'Please ensure your device is connected to WiFi and try again. Check the video tutorial for setup instructions.',
        [
          { text: 'Watch Tutorial', onPress: () => showVideoTutorial() },
          { text: 'OK' },
        ]
      );
      return;
    }

    setStep('appliance');
  };

  const showVideoTutorial = () => {
    Alert.alert(
      'Video Tutorial',
      'This would open a video tutorial showing how to connect your device to WiFi. In a real app, this would launch a video player.',
      [{ text: 'OK' }]
    );
  };

  const handleSaveAppliance = async () => {
    if (!selectedDevice || !currentUser) return;

    if (!applianceForm.name.trim() || !applianceForm.icon || !applianceForm.group) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const applianceData: ApplianceRegistration = {
        deviceId: selectedDevice.id,
        name: applianceForm.name.trim(),
        icon: applianceForm.icon,
        group: applianceForm.group,
        notificationsEnabled: applianceForm.notificationsEnabled,
      };

      // Add optional max runtime
      if (applianceForm.maxRuntime.enabled && applianceForm.maxRuntime.value) {
        applianceData.maxRuntime = {
          value: parseFloat(applianceForm.maxRuntime.value),
          unit: applianceForm.maxRuntime.unit,
        };
      }

      // Add optional max kWh
      if (applianceForm.maxKWh.enabled && applianceForm.maxKWh.value) {
        applianceData.maxKWh = parseFloat(applianceForm.maxKWh.value);
      }

      await deviceService.registerAppliance(applianceData, currentUser.uid);
      
      Alert.alert('Success', 'Appliance registered successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to register appliance');
    } finally {
      setLoading(false);
    }
  };

    const renderDeviceSection = () => (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Section</Text>
        
        {/* Device Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Device (Serial Number)</Text>
          {userDevices.length === 0 ? (
            <View style={styles.noDevicesContainer}>
              <Text style={styles.noDevicesText}>No available devices found</Text>
              <Text style={styles.noDevicesSubtext}>
                All your devices already have appliances registered, or you need to contact your administrator to activate more devices.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.deviceList} showsVerticalScrollIndicator={false}>
              {userDevices.map((device) => (
                <TouchableOpacity
                  key={device.id}
                  style={[
                    styles.deviceOption,
                    selectedDevice?.id === device.id && styles.deviceOptionSelected,
                  ]}
                  onPress={() => handleDeviceSelect(device)}
                >
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceSerial}>{device.serialNumber}</Text>
                    <Text style={styles.deviceName}>{device.name}</Text>
                  </View>
                                   <View style={styles.deviceStatus}>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: deviceStatuses[device.serialNumber]?.isConnected ? '#5B934E' : '#F44336' }
                    ]} />
                    <Text style={styles.statusText}>
                      {deviceStatuses[device.serialNumber]?.isConnected ? 'Connected' : 'Disconnected'}
                    </Text>
                    {deviceStatuses[device.serialNumber]?.applianceState && (
                      <Text style={styles.applianceStateText}>Appliance ON</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Device Name (Auto-assigned) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Device Name</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={deviceForm.deviceName}
            editable={false}
            placeholder="Auto-assigned device name"
          />
        </View>

        {/* WiFi Connection Status */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>WiFi Connection</Text>
          <View style={styles.wifiContainer}>
                       <TouchableOpacity
               style={styles.wifiButton}
               onPress={showVideoTutorial}
             >
               <Text style={styles.wifiIcon}>
                 {selectedDevice && deviceStatuses[selectedDevice.serialNumber]?.isConnected ? '📶' : '📶❓'}
               </Text>
               <Text style={styles.wifiText}>
                 {selectedDevice && deviceStatuses[selectedDevice.serialNumber]?.isConnected ? 'Connected' : 'Setup Required'}
               </Text>
             </TouchableOpacity>
             {selectedDevice && deviceStatuses[selectedDevice.serialNumber]?.isConnected && (
               <View style={styles.connectionStatus}>
                 <Text style={styles.connectionText}>
                   Appliance State: {deviceStatuses[selectedDevice.serialNumber]?.applianceState ? 'ON' : 'OFF'}
                 </Text>
               </View>
             )}
          </View>
        </View>
      </View>
  );

  const renderApplianceSection = () => (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appliance Section</Text>
        
        {/* Appliance Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Appliance Name *</Text>
          <TextInput
            style={styles.input}
            value={applianceForm.name}
            onChangeText={(text) => setApplianceForm({ ...applianceForm, name: text })}
            placeholder="Enter appliance name"
          />
        </View>

        {/* Icon Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Select an Icon *</Text>
          <TouchableOpacity
            style={styles.iconSelector}
            onPress={() => setShowIconSelector(true)}
          >
            {applianceForm.icon ? (
              <Text style={styles.selectedIcon}>{applianceForm.icon}</Text>
            ) : (
              <Text style={styles.iconPlaceholder}>Choose an icon</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Max Runtime/KWh Settings */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Set Max (Runtime/kWh) - Optional</Text>
          <View style={styles.limitContainer}>
            <TouchableOpacity
              style={[
                styles.limitButton,
                applianceForm.maxRuntime.enabled && styles.limitButtonActive,
              ]}
              onPress={() => setApplianceForm({
                ...applianceForm,
                maxRuntime: { ...applianceForm.maxRuntime, enabled: !applianceForm.maxRuntime.enabled },
                maxKWh: { ...applianceForm.maxKWh, enabled: false },
              })}
            >
              <Text style={styles.limitButtonText}>Runtime</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.limitButton,
                applianceForm.maxKWh.enabled && styles.limitButtonActive,
              ]}
              onPress={() => setApplianceForm({
                ...applianceForm,
                maxKWh: { ...applianceForm.maxKWh, enabled: !applianceForm.maxKWh.enabled },
                maxRuntime: { ...applianceForm.maxRuntime, enabled: false },
              })}
            >
              <Text style={styles.limitButtonText}>kWh</Text>
            </TouchableOpacity>
          </View>

          {/* Runtime Input */}
          {applianceForm.maxRuntime.enabled && (
            <View style={styles.limitInputContainer}>
              <TextInput
                style={[styles.input, styles.limitInput]}
                value={applianceForm.maxRuntime.value}
                onChangeText={(text) => setApplianceForm({
                  ...applianceForm,
                  maxRuntime: { ...applianceForm.maxRuntime, value: text },
                })}
                placeholder="Enter max runtime"
                keyboardType="numeric"
              />
              <View style={styles.unitSelector}>
                {(['hours', 'minutes', 'seconds'] as const).map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitButton,
                      applianceForm.maxRuntime.unit === unit && styles.unitButtonActive,
                    ]}
                    onPress={() => setApplianceForm({
                      ...applianceForm,
                      maxRuntime: { ...applianceForm.maxRuntime, unit },
                    })}
                  >
                    <Text style={styles.unitButtonText}>{unit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* kWh Input */}
          {applianceForm.maxKWh.enabled && (
            <View style={styles.limitInputContainer}>
              <TextInput
                style={styles.input}
                value={applianceForm.maxKWh.value}
                onChangeText={(text) => setApplianceForm({
                  ...applianceForm,
                  maxKWh: { ...applianceForm.maxKWh, value: text },
                })}
                placeholder="Enter max kWh"
                keyboardType="numeric"
              />
            </View>
          )}
        </View>

        {/* Group Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Group Name *</Text>
          <TouchableOpacity
            style={styles.groupSelector}
            onPress={() => setShowGroupSelector(true)}
          >
            {applianceForm.group ? (
              <Text style={styles.selectedGroup}>{applianceForm.group}</Text>
            ) : (
              <Text style={styles.groupPlaceholder}>Choose a group</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
  );

  // Icon Selector Modal
  const renderIconSelector = () => (
    <Modal
      visible={showIconSelector}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowIconSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.iconModalContent}>
          <Text style={styles.modalTitle}>Select Appliance Icon</Text>
          <ScrollView style={styles.iconGrid}>
            {deviceService.getApplianceIcons().map((iconData) => (
              <TouchableOpacity
                key={iconData.name}
                style={styles.iconOption}
                onPress={() => {
                  setApplianceForm({ ...applianceForm, icon: iconData.icon });
                  setShowIconSelector(false);
                }}
              >
                <Text style={styles.iconOptionIcon}>{iconData.icon}</Text>
                <Text style={styles.iconOptionName}>{iconData.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowIconSelector(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Group Selector Modal
  const renderGroupSelector = () => (
    <Modal
      visible={showGroupSelector}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowGroupSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.groupModalContent}>
          <Text style={styles.modalTitle}>Select Group</Text>
          <ScrollView style={styles.groupList}>
            {deviceService.getApplianceGroups().map((group) => (
              <TouchableOpacity
                key={group}
                style={styles.groupOption}
                onPress={() => {
                  setApplianceForm({ ...applianceForm, group });
                  setShowGroupSelector(false);
                }}
              >
                <Text style={styles.groupOptionText}>{group}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowGroupSelector(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 'device' ? 'Device Setup' : 'Appliance Registration'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View style={[
                styles.progressDot,
                step === 'device' && styles.progressDotActive,
              ]} />
              <Text style={styles.progressText}>Device</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={[
                styles.progressDot,
                step === 'appliance' && styles.progressDotActive,
              ]} />
              <Text style={styles.progressText}>Appliance</Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5B934E" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}

            {step === 'device' ? renderDeviceSection() : renderApplianceSection()}
          </ScrollView>

          {/* Sticky Bottom Buttons */}
          {step === 'device' && (
            <View style={styles.stickyBottomContainer}>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  (!selectedDevice || !deviceStatuses[selectedDevice.serialNumber]?.isConnected) && styles.disabledButton,
                ]}
                onPress={handleNextStep}
                disabled={!selectedDevice || !deviceStatuses[selectedDevice.serialNumber]?.isConnected}
              >
                <Text style={styles.nextButtonText}>Next: Register Appliance</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'appliance' && (
            <View style={styles.stickyBottomContainer}>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('device')}>
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!applianceForm.name || !applianceForm.icon || !applianceForm.group) && styles.disabledButton,
                  ]}
                  onPress={handleSaveAppliance}
                  disabled={!applianceForm.name || !applianceForm.icon || !applianceForm.group || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Appliance</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Modals */}
          {renderIconSelector()}
          {renderGroupSelector()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '95%',
    height: '90%',
    maxHeight: Dimensions.get('window').height * 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#D3E6BF',
  },

  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5B934E',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D3E6BF',
    marginBottom: 5,
  },
  progressDotActive: {
    backgroundColor: '#5B934E',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#D3E6BF',
    marginHorizontal: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  stickyButtonContainer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#D3E6BF',
    backgroundColor: '#FFFFFF',
  },
  stickyBottomContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#D3E6BF',
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B934E',
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#467933',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3E6BF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: '#666',
  },
  deviceList: {
    flex: 1,
    minHeight: 100,
  },
  noDevicesContainer: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3E6BF',
    alignItems: 'center',
  },
  noDevicesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#467933',
    marginBottom: 8,
  },
  noDevicesSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  deviceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#D3E6BF',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  deviceOptionSelected: {
    borderColor: '#5B934E',
    backgroundColor: '#D3E6BF',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceSerial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deviceStatus: {
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  applianceStateText: {
    fontSize: 10,
    color: '#5B934E',
    fontWeight: 'bold',
    marginTop: 2,
  },
  wifiContainer: {
    alignItems: 'center',
  },
  wifiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#D3E6BF',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  wifiIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  wifiText: {
    fontSize: 16,
    color: '#333',
  },
  connectionStatus: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#D3E6BF',
    borderRadius: 8,
  },
  connectionText: {
    fontSize: 14,
    color: '#467933',
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#5B934E',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iconSelector: {
    borderWidth: 1,
    borderColor: '#D3E6BF',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#FFFFFF',
  },
  selectedIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  iconPlaceholder: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  limitContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  limitButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D3E6BF',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  limitButtonActive: {
    backgroundColor: '#5B934E',
    borderColor: '#5B934E',
  },
  limitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#467933',
  },
  limitInputContainer: {
    marginTop: 10,
  },
  limitInput: {
    marginBottom: 10,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  unitButton: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#D3E6BF',
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  unitButtonActive: {
    backgroundColor: '#5B934E',
    borderColor: '#5B934E',
  },
  unitButtonText: {
    fontSize: 12,
    color: '#467933',
  },
  groupSelector: {
    borderWidth: 1,
    borderColor: '#D3E6BF',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#FFFFFF',
  },
  selectedGroup: {
    fontSize: 16,
    color: '#333',
  },
  groupPlaceholder: {
    fontSize: 16,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#5B934E',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  iconModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B934E',
    marginBottom: 20,
    textAlign: 'center',
  },
  iconGrid: {
    maxHeight: 400,
  },
  iconOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconOptionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  iconOptionName: {
    fontSize: 16,
    color: '#333',
  },
  groupModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  groupList: {
    maxHeight: 400,
  },
  groupOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  groupOptionText: {
    fontSize: 16,
    color: '#333',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ApplianceRegistrationModal;
