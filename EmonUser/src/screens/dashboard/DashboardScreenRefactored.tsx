import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// Gradually adding components back
import LoadingScreen from './components/LoadingScreen';
import DashboardHeader from './components/DashboardHeader';
import SummaryCards from './components/SummaryCards';
import EnergyGauge from './components/EnergyGauge';
import AppliancesList from './components/AppliancesList';
import GaugeSettingsModal from './components/GaugeSettingsModal';

// Managers needed for EnergyGauge
import { GaugeManager } from './managers/GaugeManager';

// Step 6: Adding Data Managers and Services
import { DashboardDataManager } from './managers/DashboardDataManager';
import { EnergyCalculator, EnergyTotals } from './managers/EnergyCalculator';
import { NavigationHelper } from './utils/NavigationHelper';

// Services and Models
import { SensorReadingModel } from '../../models/SensorReading';

// Types - EnergyTotals is now imported from EnergyCalculator

const DashboardScreen: React.FC = () => {
  // Navigation
  const navigation = useNavigation();
  const navigationHelper = new NavigationHelper(navigation);

  // State
  const [sensors, setSensors] = useState<{ [key: string]: SensorReadingModel }>({});
  const [userAppliances, setUserAppliances] = useState<any[]>([]);
  const [userDevices, setUserDevices] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGaugeSettings, setShowGaugeSettings] = useState(false);

  // Managers for Step 3 & 6
  const [gaugeManager] = useState(() => new GaugeManager(7, 1));
  const [dataManager] = useState(() => new DashboardDataManager(
    setSensors,
    setUserAppliances,
    setUserDevices,
    setCurrentUser,
    setLoading,
    setRefreshing
  ));

  // Calculated values
  const [energyTotals, setEnergyTotals] = useState<EnergyTotals>({
    totalEnergy: 0,
    totalDevices: 0,
    onlineAppliances: 0
  });

  // Hybrid approach: Safe data loading with error handling
  const handleDataUpdate = useCallback((): void => {
    try {
      // Use centralized calculator to ensure correct filtering and counting
      const totals = EnergyCalculator.calculateTotals(
        sensors,
        userAppliances,
        userDevices
      );

      // Extra safety: clamp to non-negative values
      setEnergyTotals({
        totalEnergy: Math.max(0, totals.totalEnergy),
        totalDevices: Math.max(0, totals.totalDevices),
        onlineAppliances: Math.max(0, totals.onlineAppliances)
      });

    } catch (error) {
      console.error('Error in handleDataUpdate:', error);
      // Fallback to safe values
      setEnergyTotals({
        totalEnergy: 0,
        totalDevices: 0,
        onlineAppliances: 0
      });
    }
  }, [sensors, userAppliances]);

  // Safe data loading with error boundaries
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const safeInitialize = async () => {
      try {
        cleanup = await dataManager.initialize();
      } catch (error) {
        console.error('Error initializing data manager:', error);
        setLoading(false);
      }
    };

    safeInitialize();

    return () => {
      if (cleanup) {
        try {
          cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    };
  }, [dataManager]);

  // Safe data update with error handling
  useEffect(() => {
    try {
      if (Object.keys(sensors).length > 0) {
        handleDataUpdate();
      }
    } catch (error) {
      console.error('Error updating data:', error);
    }
  }, [sensors, userAppliances, handleDataUpdate]);

  // Safe focus effect with error handling
  useFocusEffect(
    React.useCallback(() => {
      try {
        dataManager.loadUserData();
      } catch (error) {
        console.error('Error loading user data on focus:', error);
      }
    }, [dataManager])
  );

  const handleRefresh = async (): Promise<void> => {
    await dataManager.refresh();
  };

  // Handlers for Step 3: EnergyGauge
  const handleGaugeSettingsPress = (): void => {
    setShowGaugeSettings(true);
  };

  // Handlers for Step 4: AppliancesList
  const handleAppliancePress = (appliance: any): void => {
    navigationHelper.navigateToAppliance(appliance);
  };

  const handleApplianceToggle = async (appliance: any, device: any, value: boolean): Promise<void> => {
    await dataManager.toggleApplianceState(appliance, device, value, sensors);
  };

  // Handlers for Step 5: GaugeSettingsModal
  const handleGaugeSettingsSave = (maxValue: number, divisor: number): void => {
    console.log(`Gauge settings saved: maxValue=${maxValue}, divisor=${divisor}`);
    gaugeManager.updateSettings(maxValue, divisor);
    setShowGaugeSettings(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Extra safe component rendering with try-catch wrappers */}
      {(() => {
        try {
          return currentUser ? <DashboardHeader currentUser={currentUser} /> : null;
        } catch (error) {
          console.error('Error rendering DashboardHeader:', error);
          return null;
        }
      })()}
      
      {(() => {
        try {
          return energyTotals ? <SummaryCards totals={energyTotals} /> : null;
        } catch (error) {
          console.error('Error rendering SummaryCards:', error);
          return null;
        }
      })()}
      
      {(() => {
        try {
          return gaugeManager && energyTotals ? (
            <EnergyGauge
              currentEnergy={energyTotals.totalEnergy || 0}
              gaugeManager={gaugeManager}
              onSettingsPress={handleGaugeSettingsPress}
            />
          ) : null;
        } catch (error) {
          console.error('Error rendering EnergyGauge:', error);
          return null;
        }
      })()}
      
      {(() => {
        try {
          return userAppliances && userDevices && sensors ? (
            <AppliancesList
              userAppliances={userAppliances}
              userDevices={userDevices}
              sensors={sensors}
              onAppliancePress={handleAppliancePress}
              onApplianceToggle={handleApplianceToggle}
            />
          ) : null;
        } catch (error) {
          console.error('Error rendering AppliancesList:', error);
          return null;
        }
      })()}
      
      {(() => {
        try {
          return gaugeManager ? (
            <GaugeSettingsModal
              visible={showGaugeSettings}
              gaugeManager={gaugeManager}
              onSave={handleGaugeSettingsSave}
              onCancel={() => setShowGaugeSettings(false)}
            />
          ) : null;
        } catch (error) {
          console.error('Error rendering GaugeSettingsModal:', error);
          return null;
        }
      })()}
      
      {/* Minimal spacer to ensure proper scrolling */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});

export default DashboardScreen;
