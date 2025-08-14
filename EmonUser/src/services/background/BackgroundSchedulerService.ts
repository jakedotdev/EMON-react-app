import { AppState, AppStateStatus } from 'react-native';
import { backgroundService } from '../BackgroundService';

class BackgroundSchedulerService {
  private appStateSubscription: any = null;

  /**
   * Initialize background scheduling when app starts
   */
  async initialize(): Promise<void> {
    console.log('[BackgroundScheduler] Initializing...');
    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    // Start background service (handles immediate and hourly scheduling)
    await backgroundService.initialize();
  }

  /**
   * Handle app state changes (foreground/background)
   */
  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    console.log(`[BackgroundScheduler] App state changed to: ${nextAppState}`);
    
    if (nextAppState === 'active') {
      // App coming to foreground - trigger a capture to refresh
      await backgroundService.captureHistoricalData();
    }
  }

  /**
   * Capture historical data (delegate to backgroundService)
   */
  private async captureHistoricalData(): Promise<void> {
    await backgroundService.captureHistoricalData();
  }

  /**
   * Stop all scheduling
   */
  stop(): void {
    console.log('[BackgroundScheduler] Stopping all scheduling...');
    backgroundService.stop();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  /**
   * Force immediate capture (for testing/debugging)
   */
  async forceCapture(): Promise<void> {
    console.log('[BackgroundScheduler] Force capturing data...');
    await backgroundService.captureHistoricalData();
  }
}

export const backgroundSchedulerService = new BackgroundSchedulerService();
