import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';

// services are handled inside the manager
import { getAuth } from 'firebase/auth';
import ApplianceRegistrationModal from '../../components/appliances/ApplianceRegistrationModal';
import AppliancesHeader from './components/AppliancesHeader';
import SearchBar from './components/SearchBar';
import GroupChips from './components/GroupChips';
import BulkActionsBar from './components/BulkActionsBar';
import ApplianceCard from './components/ApplianceCard';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import ConfirmBulkDeleteModal from './components/ConfirmBulkDeleteModal';
import { AppliancesDataManager, Appliance } from './managers/AppliancesDataManager';

// Appliance type imported from manager

const AppliancesScreen: React.FC = () => {
  const route = useRoute();
  const scrollViewRef = useRef<ScrollView>(null);
  const applianceRefs = useRef<{[key: string]: View | null}>({});

  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deviceStatuses, setDeviceStatuses] = useState<{
    [deviceId: string]: { isConnected: boolean; applianceState: boolean };
  }>({});
  const [sensorData, setSensorData] = useState<{[serialNumber: string]: any}>({});
  const [expandedSensors, setExpandedSensors] = useState<{[applianceId: string]: boolean}>({});
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [applianceToDelete, setApplianceToDelete] = useState<Appliance | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('All');
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAppliances, setSelectedAppliances] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [highlightedApplianceId, setHighlightedApplianceId] = useState<string | null>(null);
  const managerRef = useRef<AppliancesDataManager | null>(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Mapping helper moved to AppliancesDataManager

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new AppliancesDataManager({
        setAppliances,
        setLoading,
        setDeviceStatuses,
        setSensorData,
        setAvailableGroups,
        setRefreshing,
      });
    }
    let cleanup: (() => void) | undefined;
    (async () => {
      cleanup = await managerRef.current!.initialize();
    })();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Handle navigation parameters to focus on specific appliance
  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as any;
      if (params?.focusedApplianceId && params?.scrollToAppliance) {
        console.log('Focusing on appliance:', params.focusedApplianceId, params.applianceName);

        // Set highlighted appliance
        setHighlightedApplianceId(params.focusedApplianceId);

        // Expand the appliance sensors if requested
        if (params.highlightAppliance) {
          setExpandedSensors(prev => ({
            ...prev,
            [params.focusedApplianceId]: true
          }));
        }

        // Clear search to ensure appliance is visible
        setSearchQuery('');

        // Scroll to appliance after a short delay to ensure rendering is complete
        setTimeout(() => {
          scrollToAppliance(params.focusedApplianceId);
        }, 500);

        // Clear highlight after 3 seconds
        setTimeout(() => {
          setHighlightedApplianceId(null);
        }, 3000);
      }
    }, [route.params])
  );

  const scrollToAppliance = (applianceId: string) => {
    const applianceRef = applianceRefs.current[applianceId];
    if (applianceRef && scrollViewRef.current) {
      applianceRef.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100, // Offset to show some content above
            animated: true
          });
        },
        () => {
          console.log('Failed to measure appliance layout');
        }
      );
    }
  };

  const loadAppliances = async () => {
    await managerRef.current?.loadAppliances();
  };

  const onRefresh = async () => {
    await managerRef.current?.refresh();
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
      await managerRef.current?.toggleApplianceState(appliance, deviceStatuses);
    } catch (error) {
      console.error('Error toggling appliance state:', error);
      Alert.alert('Error', `Failed to toggle appliance state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteAppliance = (appliance: Appliance) => {
    setApplianceToDelete(appliance);
    setShowDeleteModal(true);
  };

  const confirmDeleteAppliance = async () => {
    if (!applianceToDelete || !currentUser) return;

    try {
      setLoading(true);
      console.log('Deleting appliance:', applianceToDelete.name);

      // Delete the appliance using manager
      await managerRef.current?.deleteAppliance(currentUser.uid, applianceToDelete.id);

      // Remove from local state
      setAppliances(prev => prev.filter(a => a.id !== applianceToDelete.id));

      setShowDeleteModal(false);
      setApplianceToDelete(null);

      Alert.alert('Success', `${applianceToDelete.name} has been unregistered successfully.`);
    } catch (error) {
      console.error('Error deleting appliance:', error);
      Alert.alert('Error', 'Failed to unregister appliance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelDeleteAppliance = () => {
    setShowDeleteModal(false);
    setApplianceToDelete(null);
  };

  // Filter appliances based on search query and group
  const filteredAppliances = appliances.filter(appliance => {
    const matchesSearch = (
      appliance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appliance.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appliance.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appliance.deviceSerialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesGroup = groupFilter === 'All' || appliance.group === groupFilter;
    return matchesSearch && matchesGroup;
  });

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedAppliances(new Set());
  };

  // Toggle appliance selection
  const toggleApplianceSelection = (applianceId: string) => {
    const newSelected = new Set(selectedAppliances);
    if (newSelected.has(applianceId)) {
      newSelected.delete(applianceId);
    } else {
      newSelected.add(applianceId);
    }
    setSelectedAppliances(newSelected);
  };

  // Select all appliances
  const selectAllAppliances = () => {
    const allIds = new Set(filteredAppliances.map(a => a.id));
    setSelectedAppliances(allIds);
  };

  // Deselect all appliances
  const deselectAllAppliances = () => {
    setSelectedAppliances(new Set());
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedAppliances.size === 0) {
      Alert.alert('No Selection', 'Please select appliances to delete.');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (!currentUser || selectedAppliances.size === 0) return;

    try {
      setLoading(true);
      console.log('Bulk deleting appliances:', Array.from(selectedAppliances));

      // Delete all selected appliances using manager
      await managerRef.current?.bulkDeleteAppliances(currentUser.uid, Array.from(selectedAppliances));

      // Remove from local state
      setAppliances(prev => prev.filter(a => !selectedAppliances.has(a.id)));

      setShowBulkDeleteModal(false);
      setSelectedAppliances(new Set());
      setIsSelectionMode(false);

      Alert.alert('Success', `${selectedAppliances.size} appliance(s) have been unregistered successfully.`);
    } catch (error) {
      console.error('Error bulk deleting appliances:', error);
      Alert.alert('Error', 'Failed to unregister some appliances. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel bulk delete
  const cancelBulkDelete = () => {
    setShowBulkDeleteModal(false);
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
      <AppliancesHeader total={appliances.length} onAddPress={() => setShowRegistrationModal(true)} />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <GroupChips groups={availableGroups} selected={groupFilter} onSelect={setGroupFilter} />
      <BulkActionsBar
        isSelectionMode={isSelectionMode}
        selectedCount={selectedAppliances.size}
        totalFiltered={filteredAppliances.length}
        onToggleSelectionMode={toggleSelectionMode}
        onSelectAll={selectAllAppliances}
        onDeselectAll={deselectAllAppliances}
        onBulkDelete={handleBulkDelete}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredAppliances.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {appliances.length === 0 ? 'No Appliances Found' : 'No Search Results'}
            </Text>
            <Text style={styles.emptyText}>
              {appliances.length === 0
                ? "You haven't registered any appliances yet. Go to the registration modal to add your first appliance."
                : `No appliances match "${searchQuery}". Try a different search term.`
              }
            </Text>
          </View>
        ) : (
          filteredAppliances.map(appliance => (
            <ApplianceCard
              key={appliance.id}
              appliance={appliance}
              isSelectionMode={isSelectionMode}
              selected={selectedAppliances.has(appliance.id)}
              onSelectToggle={() => toggleApplianceSelection(appliance.id)}
              onDelete={() => handleDeleteAppliance(appliance)}
              status={getApplianceStatus(appliance)}
              sensorDataForDevice={sensorData[appliance.deviceSerialNumber || '']}
              onToggleAppliance={() => toggleApplianceState(appliance)}
              isHighlighted={highlightedApplianceId === appliance.id}
              isExpanded={!!expandedSensors[appliance.id]}
              onToggleExpand={() => toggleSensorView(appliance.id)}
            />
          ))
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

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        visible={showDeleteModal}
        name={applianceToDelete?.name}
        onCancel={cancelDeleteAppliance}
        onConfirm={confirmDeleteAppliance}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmBulkDeleteModal
        visible={showBulkDeleteModal}
        count={selectedAppliances.size}
        onCancel={cancelBulkDelete}
        onConfirm={confirmBulkDelete}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5B934E',
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  chipsContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  chipSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#5B934E',
  },
  chipText: {
    color: '#555555',
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#2E7D32',
    fontWeight: 'bold',
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
  energyInfo: {
    fontSize: 12,
    color: '#5B934E',
    fontWeight: '600',
    marginTop: 2,
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
  spacer: {
    flex: 1,
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
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
  },
  deleteIcon: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 320,
    width: '90%',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F44336',
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    marginTop: 12,
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bulkActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  selectionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#5B934E',
  },
  selectionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#E8F5E8',
  },
  selectAllButtonText: {
    color: '#467933',
    fontSize: 14,
    fontWeight: '600',
  },
  bulkDeleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F44336',
  },
  bulkDeleteButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  bulkDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bulkDeleteButtonTextDisabled: {
    color: '#999999',
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#5B934E',
    borderColor: '#5B934E',
  },
  checkboxText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AppliancesScreen;
