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
import { firestore } from '../../services/firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { notificationsService } from '../../services/notifications/notificationsService';

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

  // Load persisted gauge settings when user is available
  useEffect(() => {
    const loadGaugeSettings = async () => {
      try {
        const uid = currentUser?.uid;
        if (!uid) return;
        const ref = doc(firestore, 'users', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data: any = snap.data();
          const saved = data?.dashboardGauge;
          if (saved && Number.isFinite(saved.maxValue) && [1, 2, 3, 5].includes(saved.divisor)) {
            gaugeManager.updateSettings(
              Math.max(1, Math.min(50, Number(saved.maxValue))),
              saved.divisor
            );
          }
        }
      } catch (e) {
        console.warn('Failed to load gauge settings from Firestore:', e);
      }
    };
    loadGaugeSettings();
    // Intentionally exclude gaugeManager from deps to avoid re-running unnecessarily
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Trigger notification if total energy exceeds gauge max
  useEffect(() => {
    const maybeNotify = async () => {
      try {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;
        const max = gaugeManager.getSettings().maxValue;
        const total = energyTotals.totalEnergy || 0;
        if (total > max) {
          const key = 'gauge_exceed';
          const already = await notificationsService.hasSimilarToday(uid, 'GAUGE_LIMIT', key);
          if (!already) {
            await notificationsService.add(uid, {
              type: 'GAUGE_LIMIT',
              title: 'Total energy exceeded gauge limit',
              body: `Your total energy (${total.toFixed(2)} kWh) exceeded the gauge max (${max} kWh).`,
              createdAt: new Date(),
              read: false,
              meta: { key, total, max }
            });
          }
        }
      } catch (e) {
        console.warn('Failed to create gauge exceed notification:', e);
      }
    };
    maybeNotify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [energyTotals.totalEnergy]);

  // Helper to derive sensorId from device serial (mirrors AppliancesDataManager logic)
  const getSensorIdFromSerialNumber = (serialNumber: string): string => {
    if (!serialNumber) return '1';
    const currentPattern = serialNumber.match(/^11032(\d{2})(\d)$/);
    if (currentPattern) return currentPattern[2];
    const lastDigitMatch = serialNumber.match(/(\d+)$/);
    if (lastDigitMatch) {
      const lastDigits = lastDigitMatch[1];
      return lastDigits.length > 2 ? lastDigits.slice(-1) : lastDigits;
    }
    const hash = serialNumber.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff, 0);
    const sensorId = (Math.abs(hash) % 100 + 1).toString();
    return sensorId;
  };

  // Trigger notifications for appliances exceeding their Max kWh / Runtime
  useEffect(() => {
    const checkApplianceLimits = async () => {
      try {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;
        if (!userAppliances?.length || !userDevices?.length) return;

        // Map deviceId -> device
        const deviceById: Record<string, any> = {};
        userDevices.forEach((d: any) => { deviceById[d.id] = d; });

        for (const appliance of userAppliances) {
          const device = deviceById[appliance.deviceId];
          const serial = device?.serialNumber || '';
          const sensorId = getSensorIdFromSerialNumber(serial);
          const sensorKey = `SensorReadings_${sensorId}`; // keys are normalized by sensorService
          const sensor = (sensors as any)?.[sensorKey] as SensorReadingModel | undefined;
          if (!sensor) continue;

          // Respect appliance notification toggle when provided
          if (appliance.notificationsEnabled === false) continue;

          // Check kWh limit
          if (typeof appliance.maxKWh === 'number' && appliance.maxKWh > 0) {
            const totalKWh = Number(sensor.energy || 0);
            if (totalKWh > appliance.maxKWh) {
              const key = `kwh_${appliance.id}`;
              const already = await notificationsService.hasSimilarToday(uid, 'APPLIANCE_LIMIT', key);
              if (!already) {
                await notificationsService.add(uid, {
                  type: 'APPLIANCE_LIMIT',
                  title: `${appliance.name} exceeded Max kWh`,
                  body: `${appliance.name} used ${totalKWh.toFixed(2)} kWh (limit ${appliance.maxKWh} kWh).`,
                  createdAt: new Date(),
                  read: false,
                  meta: { key, applianceId: appliance.id, serial, totalKWh, limit: appliance.maxKWh }
                });
              }
            }
          }

          // Check runtime limit
          if (appliance.maxRuntime?.value && appliance.maxRuntime?.unit) {
            const toSeconds = (v: number, u: string) => {
              switch (u) {
                case 'hours': return v * 3600;
                case 'minutes': return v * 60;
                case 'seconds': return v;
                default: return v;
              }
            };
            const limitSec = toSeconds(Number(appliance.maxRuntime.value), String(appliance.maxRuntime.unit));
            const runtimeSec = Number((sensor.runtimehr || 0) * 3600 + (sensor.runtimemin || 0) * 60 + (sensor.runtimesec || 0));
            if (limitSec > 0 && runtimeSec > limitSec) {
              const key = `runtime_${appliance.id}`;
              const already = await notificationsService.hasSimilarToday(uid, 'APPLIANCE_LIMIT', key);
              if (!already) {
                await notificationsService.add(uid, {
                  type: 'APPLIANCE_LIMIT',
                  title: `${appliance.name} exceeded Max runtime`,
                  body: `${appliance.name} ran ${Math.floor(runtimeSec/3600)}h ${Math.floor((runtimeSec%3600)/60)}m (limit ${appliance.maxRuntime.value} ${appliance.maxRuntime.unit}).`,
                  createdAt: new Date(),
                  read: false,
                  meta: { key, applianceId: appliance.id, serial, runtimeSec, limitSec }
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to create appliance limit notifications:', e);
      }
    };
    checkApplianceLimits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensors, userAppliances, userDevices]);

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
    // Persist to Firestore for the current user
    (async () => {
      try {
        const uid = (currentUser as any)?.uid;
        if (!uid) return;
        const ref = doc(firestore, 'users', uid);
        await updateDoc(ref, {
          dashboardGauge: { maxValue: Math.max(1, Math.min(50, maxValue)), divisor }
        });
      } catch (e) {
        console.warn('Failed to save gauge settings to Firestore:', e);
      }
    })();
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
