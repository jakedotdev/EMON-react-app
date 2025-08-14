export class TimeFormatter {
  private static preferredTZ: string | undefined;
  private static listeners: Set<() => void> = new Set();

  static setTimeZone(tz?: string) {
    // Accept only non-empty strings; undefined clears to fallback
    if (tz && typeof tz === 'string') {
      this.preferredTZ = tz;
    } else {
      this.preferredTZ = undefined;
    }
    // Notify listeners so UI can refresh immediately
    this.listeners.forEach((cb) => {
      try { cb(); } catch {}
    });
  }

  // Allow components to react to timezone changes
  static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static getTimeZone(): string {
    if (this.preferredTZ) return this.preferredTZ;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  static formatTime(): string {
    const now = new Date();
    const timeZone = this.getTimeZone();
    return now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone,
    });
  }

  static formatDate(): string {
    const now = new Date();
    const timeZone = this.getTimeZone();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone,
    });
  }

  static formatDateTime(): string {
    return `${TimeFormatter.formatDate()} • ${TimeFormatter.formatTime()}`;
  }

  static formatShortTime(): string {
    const now = new Date();
    const timeZone = this.getTimeZone();
    return now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    });
  }

  static formatShortDate(): string {
    const now = new Date();
    const timeZone = this.getTimeZone();
    return now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone,
    });
  }

  static getGreeting(): string {
    const now = new Date();
    const timeZone = this.getTimeZone();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(now));
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  static getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const now = new Date();
    const timeZone = this.getTimeZone();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(now));
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  static isBusinessHours(): boolean {
    const now = new Date();
    const timeZone = this.getTimeZone();
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(hourFormatter.format(now));
    // Get day of week using preferred timezone
    const localDate = new Date(now.toLocaleString('en-US', { timeZone }));
    const day = localDate.getDay(); // 0 = Sunday, 6 = Saturday
    // Monday to Friday, 9 AM to 5 PM in preferred timezone
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  }

  static formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  }

  static createTimeUpdateInterval(callback: () => void): () => void {
    const interval = setInterval(callback, 1000);
    return () => clearInterval(interval);
  }
}
