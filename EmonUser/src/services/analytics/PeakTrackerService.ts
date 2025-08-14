// Lightweight in-app peak tracker to avoid Firestore write amplification in realtime
// Tracks peak instantaneous energy consumption rate (delta between readings) per user per day
// Peak Energy = highest energy consumption rate observed, not highest total energy

export interface PeakState {
  lastTotal: number | undefined;
  peakDelta: number; // kWh
  peakAtMs?: number; // epoch millis when peak occurred
}

class PeakTrackerService {
  private store: Map<string, PeakState> = new Map();

  private key(uid: string, dateKey: string) {
    return `${uid}::${dateKey}`;
  }

  getState(uid: string, dateKey: string): PeakState | undefined {
    return this.store.get(this.key(uid, dateKey));
  }

  setState(uid: string, dateKey: string, state: PeakState): void {
    this.store.set(this.key(uid, dateKey), state);
  }

  updateAndGet(uid: string, dateKey: string, currentTotal: number, nowMs?: number): { peak: number; last: number | undefined; peakAtMs?: number; newPeak: boolean } {
    const k = this.key(uid, dateKey);
    const state = this.store.get(k) || { lastTotal: undefined, peakDelta: 0 } as PeakState;

    let delta = 0;
    let newPeak = false;

    if (typeof state.lastTotal === 'number') {
      // Calculate instantaneous energy consumption rate (delta)
      // This represents the energy consumed since the last reading
      delta = Math.max(0, currentTotal - state.lastTotal);
      
      // Check if this delta is a new peak (higher than previous peak)
      if (delta > state.peakDelta) {
        state.peakDelta = delta;
        state.peakAtMs = nowMs ?? Date.now();
        newPeak = true;
      }
    } else {
      // First reading of the day - no previous total to compare against
      // Don't set any peak yet, just store the current total as baseline
      // Peak tracking will start with the next reading
    }

    // Always update the last total for next comparison
    state.lastTotal = currentTotal;
    this.store.set(k, state);

    return { peak: state.peakDelta, last: state.lastTotal, peakAtMs: state.peakAtMs, newPeak };
  }

  reset(uid: string, dateKey: string) {
    const k = this.key(uid, dateKey);
    this.store.delete(k);
  }
}

export const peakTrackerService = new PeakTrackerService();
