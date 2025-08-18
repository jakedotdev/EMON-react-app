export interface ApplianceNavigationParams {
  focusedApplianceId: string;
  applianceName: string;
  deviceId: string;
  scrollToAppliance: boolean;
  highlightAppliance: boolean;
  timestamp: number;
}

export class NavigationHelper {
  private navigation: any;

  constructor(navigation: any) {
    this.navigation = navigation;
  }

  navigateToAppliance(appliance: any): void {
    console.log('Navigating to appliance:', appliance.name, appliance.id);
    
    const params: ApplianceNavigationParams = {
      focusedApplianceId: appliance.id,
      applianceName: appliance.name,
      deviceId: appliance.deviceId,
      scrollToAppliance: true,
      highlightAppliance: true,
      timestamp: Date.now() // Ensures navigation triggers even if already on screen
    };

    this.navigation.navigate('Appliances', params);
  }

  navigateToSettings(): void {
    this.navigation.navigate('Settings');
  }

  navigateToProfile(): void {
    this.navigation.navigate('Profile');
  }

  navigateToDevices(): void {
    this.navigation.navigate('Devices');
  }

  navigateToAnalytics(): void {
    this.navigation.navigate('Analytics');
  }

  goBack(): void {
    if (this.navigation.canGoBack()) {
      this.navigation.goBack();
    }
  }

  resetToHome(): void {
    this.navigation.reset({
      index: 0,
      routes: [{ name: 'Dashboard' }],
    });
  }

  static createNavigationHelper(navigation: any): NavigationHelper {
    return new NavigationHelper(navigation);
  }
}
