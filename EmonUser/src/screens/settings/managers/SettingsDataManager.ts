import { getAuth } from 'firebase/auth';
import { authService } from '../../../services/auth/authService';
import { TimeFormatter } from '../../dashboard/utils/TimeFormatter';

export class SettingsDataManager {
  // Load preferred timezone for current user; fallback to device tz or UTC
  async loadPreferredTimezone(): Promise<string> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        return this.getDeviceOrUTC();
      }
      const profile = await authService.getUserProfile(user.uid);
      const tz = profile?.preferredTimezone || this.getDeviceOrUTC();
      this.applyTimeZone(tz);
      return tz;
    } catch {
      const tz = this.getDeviceOrUTC();
      this.applyTimeZone(tz);
      return tz;
    }
  }

  // Validate an IANA timezone string
  validateTimezone(tz: string): boolean {
    try {
      // Will throw if invalid tz
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
      return true;
    } catch {
      return false;
    }
  }

  // Persist timezone to backend for current user
  async savePreferredTimezone(tz: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    await authService.updateUserProfile(user.uid, { preferredTimezone: tz });
  }

  // Apply to TimeFormatter for app-wide use
  applyTimeZone(tz: string) {
    TimeFormatter.setTimeZone(tz);
  }

  private getDeviceOrUTC(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }
}

export const settingsDataManager = new SettingsDataManager();
