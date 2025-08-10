export class TimeFormatter {
  static formatTime(): string {
    // Force Philippine timezone (UTC+8)
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Manila',
    });
  }

  static formatDate(): string {
    // Force Philippine timezone (UTC+8)
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    });
  }

  static formatDateTime(): string {
    return `${TimeFormatter.formatDate()} • ${TimeFormatter.formatTime()}`;
  }

  static formatShortTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    });
  }

  static formatShortDate(): string {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    });
  }

  static getGreeting(): string {
    // Get Philippine time for greeting using Intl.DateTimeFormat
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(formatter.format(now));
    
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  static getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    // Get Philippine time for time of day using Intl.DateTimeFormat
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(formatter.format(now));
    
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  static isBusinessHours(): boolean {
    // Get Philippine time for business hours using Intl.DateTimeFormat
    const now = new Date();
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(hourFormatter.format(now));
    
    // Get day of week using Philippine timezone
    const philippineDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const day = philippineDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Monday to Friday, 9 AM to 5 PM (Philippine time)
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
