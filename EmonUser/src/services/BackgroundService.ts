import { AppState, AppStateStatus } from 'react-native';
import { sensorService } from './sensors/sensorService';
import { historicalDataStoreService } from './analytics/HistoricalDataStoreService';
import { authService } from './auth/authService';


class BackgroundService {
  private isRunning = false;
  private appStateSubscription: any = null;
  private hourlyInterval: any = null;
  private lastCaptureTime: number = 0;
  private readonly CAPTURE_INTERVAL = 60 * 60 * 1000; // 1 hour in ms

  async initialize() {
    if (this.isRunning) return;
    
    console.log('[BackgroundService] Initializing...');
    
    // Load initial data
    await this.captureHistoricalData();
    
    // Set up app state change listener
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
    
    // Start background timer
    this.startBackgroundTimer();
    
    this.isRunning = true;
    console.log('[BackgroundService] Initialized');
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    console.log(`[BackgroundService] App state changed to: ${nextAppState}`);
    
    if (nextAppState === 'active') {
      // App came to foreground, ensure we have fresh data
      this.captureHistoricalData();
    }
  }

  private startBackgroundTimer() {
    // Clear any existing interval
    if (this.hourlyInterval) {
      clearInterval(this.hourlyInterval);
    }

    // Calculate time until next hour
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const msUntilNextHour = nextHour.getTime() - now.getTime();

    console.log(`[BackgroundService] Next capture in ${Math.round(msUntilNextHour / 1000 / 60)} minutes`);

    // Set timeout for next hour, then interval for subsequent hours
    setTimeout(() => {
      this.captureHistoricalData();
      
      // Set up hourly interval
      this.hourlyInterval = setInterval(() => {
        this.captureHistoricalData();
      }, this.CAPTURE_INTERVAL);
    }, msUntilNextHour);
  }

  async captureHistoricalData() {
    const now = Date.now();
    
    // Don't capture more than once per hour
    if (now - this.lastCaptureTime < this.CAPTURE_INTERVAL - 60000) { // 1 minute buffer
      console.log('[BackgroundService] Skipping capture - too soon since last capture');
      return;
    }

    console.log('[BackgroundService] Capturing historical data...');
    
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        console.log('[BackgroundService] No authenticated user, skipping capture');
        return;
      }
      const uid = user.uid;

      const sensors = await sensorService.getAllSensorData();
      if (!sensors || Object.keys(sensors).length === 0) {
        console.log('[BackgroundService] No sensor data available, skipping capture');
        return;
      }

      await historicalDataStoreService.capturePeriodics(uid, sensors);
      this.lastCaptureTime = now;
      console.log('[BackgroundService] Historical data captured successfully');
      
    } catch (error) {
      console.error('[BackgroundService] Error capturing historical data:', error);
    }
  }

  stop() {
    if (this.hourlyInterval) {
      clearInterval(this.hourlyInterval);
      this.hourlyInterval = null;
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    this.isRunning = false;
    console.log('[BackgroundService] Stopped');
  }
}

export const backgroundService = new BackgroundService();
