import { sensorService } from '../sensors/sensorService';
import { deviceService } from '../devices/deviceService';
import { SensorReadingModel } from '../../models/SensorReading';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { peakTrackerService } from './PeakTrackerService';

export interface SummaryCardData {
  totalValue: number;
  totalLabel: string;
  avgValue: number;
  avgLabel: string;
  peakValue: number;
  peakLabel: string;
  peakDetail?: string; // For showing hour/day/week details
}

export class EnergyCalculationService {
  private db = getFirestore();
  
  private getUid(): string | undefined {
    return getAuth().currentUser?.uid || undefined;
  }
  
  async getUserTimezone(uid: string): Promise<string> {
    const profileRef = doc(this.db, 'users', uid);
    const snap = await getDoc(profileRef);
    return (snap.data()?.preferredTimezone as string) || 'UTC';
  }
  
  nowInTimezone(tz: string): Date {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  }
  
  private dateKeyUTC(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }
  
  private pad2(n: number): string { return String(n).padStart(2, '0'); }
  private formatHour12(h: number): string {
    const hr = ((h % 24) + 24) % 24;
    const suffix = hr < 12 ? 'AM' : 'PM';
    const display = hr % 12 === 0 ? 12 : hr % 12;
    return `${display}:00 ${suffix}`;
  }
  private formatTime12FromDate(d: Date, tz: string): string {
    // Use Intl with minute-level precision in target timezone
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).formatToParts(d);
    const hour = parts.find(p => p.type === 'hour')?.value ?? '12';
    const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
    const dayPeriod = (parts.find(p => p.type === 'dayPeriod')?.value || '').toUpperCase();
    return `${hour}:${minute} ${dayPeriod}`.trim();
  }
  
  private formatISOWeekKey(date: Date): string {
    const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) as Date & { valueOf: () => number };
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1)) as Date & { valueOf: () => number };
    const weekNo = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }
  
  private shiftWeekKey(weekKey: string, delta: number): string {
    const [yearStr, wStr] = weekKey.split('-W');
    const year = Number(yearStr);
    const week = Number(wStr);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const weekStart = new Date(jan4);
    weekStart.setUTCDate(jan4.getUTCDate() + (week - 1 + delta) * 7 - ((jan4.getUTCDay() || 7) - 1));
    return this.formatISOWeekKey(weekStart);
  }
  
  private monthKeyUTC(date: Date): string {
    return `${date.getUTCFullYear()}-${this.pad2(date.getUTCMonth() + 1)}`;
  }
  
  /**
   * Get realtime summary data
   */
  async getRealtimeSummary(): Promise<SummaryCardData> {
    try {
      const sensors = await sensorService.getAllSensorData();
      // Will hold average current energy across online (ON) appliances
      let avgEnergy = 0;
      // Mirror Dashboard logic: sum only sensors belonging to user's devices that have registered appliances
      const uid = this.getUid();
      let totalEnergy = 0;
      if (uid) {
        const [userDevices, userAppliances] = await Promise.all([
          deviceService.getUserDevices(uid),
          deviceService.getUserAppliances(uid),
        ]);
        const deviceIdBySerial = new Map<string, string>();
        userDevices.forEach(d => {
          if (d?.serialNumber && d?.id) deviceIdBySerial.set(d.serialNumber, d.id);
        });
        const deviceIdsWithAppliances = new Set<string>(userAppliances.map(a => a.deviceId).filter(Boolean));
        const perApplianceEnergies: number[] = [];
        Object.values(sensors).forEach(sensor => {
          const serial = (sensor as any)?.serialNumber as string | undefined;
          if (!serial) return;
          const deviceId = deviceIdBySerial.get(serial);
          if (deviceId && deviceIdsWithAppliances.has(deviceId)) {
            const energyVal = typeof sensor.energy === 'number' && isFinite(sensor.energy) ? sensor.energy : 0;
            totalEnergy += energyVal;
            // Determine if appliance is ON
            const rawState: any = (sensor as any).applianceState;
            const isOn = (rawState === true)
              || (typeof rawState === 'string' && rawState.toLowerCase() === 'true')
              || (typeof rawState === 'number' && rawState === 1);
            if (isOn) {
              perApplianceEnergies.push(energyVal);
            }
          }
        });
        // Average current energy across online (ON) appliances
        avgEnergy = perApplianceEnergies.length > 0
          ? perApplianceEnergies.reduce((a, b) => a + b, 0) / perApplianceEnergies.length
          : 0;
      } else {
        // Fallback: if no uid, sum all sensors (best-effort)
        const energies: number[] = [];
        totalEnergy = Object.values(sensors).reduce((sum, sensor) => {
          const val = (sensor as any)?.energy ?? 0;
          const rawState: any = (sensor as any)?.applianceState;
          const isOn = (rawState === true)
            || (typeof rawState === 'string' && rawState.toLowerCase() === 'true')
            || (typeof rawState === 'number' && rawState === 1);
          if (isOn) energies.push(typeof val === 'number' && isFinite(val) ? val : 0);
          return sum + ((typeof val === 'number' && isFinite(val)) ? val : 0);
        }, 0);
        avgEnergy = energies.length > 0 ? energies.reduce((a, b) => a + b, 0) / energies.length : 0;
      }

      // Peak/Avg Energy
      // Avg from hourly deltas up to current hour; Peak tracked in-memory without Firestore writes
      let peakValue = 0;
      let peakDetailText: string | undefined;
      if (uid) {
        const tz = await this.getUserTimezone(uid);
        const nowTz = this.nowInTimezone(tz);
        const todayKey = this.dateKeyUTC(nowTz);
        // Seed in-memory tracker from Firestore if empty
        if (!peakTrackerService.getState(uid, todayKey)) {
          const peakRef = doc(this.db, `users/${uid}/analyticsRealtimePeakByDay`, todayKey);
          const peakSnap = await getDoc(peakRef);
          if (peakSnap.exists()) {
            const data: any = peakSnap.data();
            const state = {
              lastTotal: undefined,
              peakDelta: typeof data?.value === 'number' ? Number(data.value) : 0,
              peakAtMs: (data?.updatedAt && typeof data.updatedAt.toDate === 'function')
                ? (data.updatedAt.toDate() as Date).getTime()
                : undefined,
            };
            peakTrackerService.setState(uid, todayKey, state);
          } else {
            // Initialize with empty state for today if no Firestore record exists
            // This ensures peak tracking starts properly for new days
            const initialState = {
              lastTotal: undefined,
              peakDelta: 0,
              peakAtMs: undefined,
            };
            peakTrackerService.setState(uid, todayKey, initialState);
          }
        }
        // Derive hours passed in user's local day (00:00..current hour)
        const startOfDayTz = new Date(Date.UTC(
          nowTz.getUTCFullYear(), nowTz.getUTCMonth(), nowTz.getUTCDate(), 0, 0, 0, 0
        ));
        const hoursPassed = Math.floor((nowTz.getTime() - startOfDayTz.getTime()) / 3600000) + 1;
        const currentHour = Math.max(0, hoursPassed - 1);

        // Compute average as-of-now: sum hourly deltas for hours 0..currentHour, divide by hours passed (currentHour+1)
        let sumDeltas = 0;
        let prevEnd: number | undefined;
        for (let h = 0; h <= currentHour; h++) {
          const hourKey = this.pad2(h);
          const ref = doc(this.db, `users/${uid}/historical/root/hourly/${todayKey}/hours/${hourKey}`);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            continue;
          }
          const data: any = snap.data();
          if (typeof data?.deltaKWh === 'number') {
            sumDeltas += Math.max(0, Number(data.deltaKWh));
            if (typeof data?.totalEnergyAtEnd === 'number') prevEnd = Number(data.totalEnergyAtEnd);
          } else if (typeof data?.totalEnergyAtEnd === 'number') {
            const end = Number(data.totalEnergyAtEnd);
            if (prevEnd !== undefined) {
              sumDeltas += Math.max(0, end - prevEnd);
            } else {
              // Baseline for first available hour: previous day 23:00
              const prevDay = new Date(nowTz); prevDay.setUTCDate(prevDay.getUTCDate() - 1);
              const prevRef = doc(this.db, `users/${uid}/historical/root/hourly/${this.dateKeyUTC(prevDay)}/hours/23`);
              const prevSnap = await getDoc(prevRef);
              const base = prevSnap.exists() ? (prevSnap.data() as any)?.totalEnergyAtEnd : undefined;
              if (typeof base === 'number') sumDeltas += Math.max(0, end - Number(base));
            }
            prevEnd = end;
          }
        }
        avgEnergy = hoursPassed > 0 ? (sumDeltas / hoursPassed) : 0;

        // Realtime peak via in-memory tracker
        const { peak, peakAtMs, newPeak } = peakTrackerService.updateAndGet(uid, todayKey, totalEnergy, Date.now());
        peakValue = peak;
        if (peakAtMs) {
          peakDetailText = `at ${this.formatTime12FromDate(new Date(peakAtMs), tz)}`;
        }
        // Persist to Firestore only when a meaningful new peak is observed
        // Only write to Firestore if the peak value is significant (> 0.001 kWh)
        // This avoids storing trivial peaks and reduces Firestore writes
        if (newPeak && peakValue > 0.001) {
          const atHour = nowTz.getUTCHours();
          const label = this.formatTime12FromDate(new Date(peakAtMs ?? Date.now()), tz);
          const peakRef = doc(this.db, `users/${uid}/analyticsRealtimePeakByDay`, todayKey);
          await setDoc(peakRef, {
            value: Number(peakValue.toFixed(6)),
            dateKey: todayKey,
            atHour,
            atHourLabel12: label,
            timezone: tz,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      return {
        totalValue: Number(totalEnergy.toFixed(6)),
        totalLabel: 'Total Energy',
        avgValue: Number(avgEnergy.toFixed(6)),
        avgLabel: 'Avg Energy',
        peakValue: Number(peakValue.toFixed(6)),
        peakLabel: 'Peak Energy',
        peakDetail: peakDetailText,
      };
    } catch (error) {
      console.error('Error getting realtime summary:', error);
      return this.getEmptySummary();
    }
  }
  
  /**
   * Get daily summary data for a specific date if provided; otherwise defaults to yesterday's consumption
   */
  async getDailySummary(selectedDate?: Date): Promise<SummaryCardData> {
    try {
      const uid = this.getUid();
      if (!uid) return this.getEmptySummary();
      const tz = await this.getUserTimezone(uid);
      const nowTz = this.nowInTimezone(tz);
      // If a date is selected, use that date. Otherwise default to yesterday (in user's timezone)
      const targetDate = selectedDate ? new Date(Date.UTC(
        selectedDate.getUTCFullYear(),
        selectedDate.getUTCMonth(),
        selectedDate.getUTCDate(),
        0, 0, 0, 0
      )) : (() => { const d = new Date(nowTz); d.setUTCDate(nowTz.getUTCDate() - 1); return d; })();
      const yKey = this.dateKeyUTC(targetDate);
      // Build strictly from hourly docs of the day
      let dailyTotal = 0;
      let peakVal = 0; let peakHour = '00';
      let prevEndTotal: number | undefined;
      for (let h = 0; h < 24; h++) {
        const hourRef = doc(this.db, `users/${uid}/historical/root/hourly/${yKey}/hours/${this.pad2(h)}`);
        const hourSnap = await getDoc(hourRef);
        let delta = 0;
        if (hourSnap.exists()) {
          const data: any = hourSnap.data();
          if (typeof data?.deltaKWh === 'number') {
            delta = Math.max(0, Number(data.deltaKWh));
            if (typeof data?.totalEnergyAtEnd === 'number') prevEndTotal = Number(data.totalEnergyAtEnd);
          } else if (typeof data?.totalEnergyAtEnd === 'number') {
            const end = Number(data.totalEnergyAtEnd);
            if (prevEndTotal !== undefined) {
              delta = Math.max(0, end - prevEndTotal);
            } else {
              // baseline for 00:00 uses previous day 23:00
              const prevKey = (() => {
                const d = new Date(targetDate); d.setUTCDate(d.getUTCDate() - 1); return this.dateKeyUTC(d);
              })();
              const prevRef = doc(this.db, `users/${uid}/historical/root/hourly/${prevKey}/hours/23`);
              const prevSnap = await getDoc(prevRef);
              const base = prevSnap.exists() ? (prevSnap.data() as any)?.totalEnergyAtEnd : undefined;
              if (typeof base === 'number') delta = Math.max(0, end - Number(base));
            }
            prevEndTotal = end;
          }
        }
        dailyTotal += delta;
        if (delta > peakVal) { peakVal = delta; peakHour = this.pad2(h); }
      }

      const avgHourly = dailyTotal / 24;

      return {
        totalValue: Number(dailyTotal.toFixed(6)),
        totalLabel: 'Daily Total',
        avgValue: Number(avgHourly.toFixed(6)),
        avgLabel: 'Avg Hourly',
        peakValue: Number(peakVal.toFixed(6)),
        peakLabel: 'Peak Hour',
        peakDetail: `at ${this.formatHour12(Number(peakHour))}`,
      };
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return this.getEmptySummary();
    }
  }
  
  /**
   * Get weekly summary data (last week's consumption)
   */
  async getWeeklySummary(baseDate?: Date): Promise<SummaryCardData> {
    try {
      const uid = this.getUid();
      if (!uid) return this.getEmptySummary();
      const tz = await this.getUserTimezone(uid);
      const nowTz = this.nowInTimezone(tz);
      // Determine ISO week window (Mon..Sun). If baseDate provided, use its week; otherwise last completed week.
      const targetWeekKey = baseDate
        ? this.formatISOWeekKey(new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate())))
        : this.shiftWeekKey(this.formatISOWeekKey(nowTz), -1);
      const [yearStr, wStr] = targetWeekKey.split('-W');
      const year = Number(yearStr);
      const week = Number(wStr);
      const jan4 = new Date(Date.UTC(year, 0, 4));
      const monday = new Date(jan4);
      monday.setUTCDate(jan4.getUTCDate() + (week - 1) * 7 - ((jan4.getUTCDay() || 7) - 1));
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);

      // Sum daily deltas built from hourly docs for Mon..Sun
      let weeklyTotal = 0;
      let peakVal = 0; let peakDayLabel = '';
      for (let dt = new Date(monday); dt <= sunday; dt.setUTCDate(dt.getUTCDate() + 1)) {
        const dayTotal = await this.computeDailyDeltaFromHourly(uid, dt);
        weeklyTotal += dayTotal;
        if (dayTotal > peakVal) { peakVal = dayTotal; peakDayLabel = this.dateKeyUTC(dt); }
      }

      const avgDaily = weeklyTotal / 7;

      return {
        totalValue: Number(weeklyTotal.toFixed(6)),
        totalLabel: 'Weekly Total',
        avgValue: Number(avgDaily.toFixed(6)),
        avgLabel: 'Avg Daily',
        peakValue: Number(peakVal.toFixed(6)),
        peakLabel: 'Peak Day',
        peakDetail: peakDayLabel ? `on ${peakDayLabel}` : undefined,
      };
    } catch (error) {
      console.error('Error getting weekly summary:', error);
      return this.getEmptySummary();
    }
  }
  
  /**
   * Get monthly summary data. If baseDate provided, uses that month; otherwise last completed month.
   */
  async getMonthlySummary(baseDate?: Date): Promise<SummaryCardData> {
    try {
      const uid = this.getUid();
      if (!uid) return this.getEmptySummary();
      const tz = await this.getUserTimezone(uid);
      const nowTz = this.nowInTimezone(tz);
      // Determine month window in UTC
      let monthStart: Date;
      let monthEnd: Date;
      if (baseDate) {
        const y = baseDate.getUTCFullYear();
        const m = baseDate.getUTCMonth();
        monthStart = new Date(Date.UTC(y, m, 1));
        monthEnd = new Date(Date.UTC(y, m + 1, 0));
      } else {
        const currentMonthKey = this.monthKeyUTC(nowTz);
        // Previous month window in UTC
        const [y, m] = currentMonthKey.split('-').map(Number);
        const prevMonth = new Date(Date.UTC(y, m - 1, 1));
        prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
        monthStart = new Date(Date.UTC(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth(), 1));
        monthEnd = new Date(Date.UTC(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth() + 1, 0));
      }

      // Sum daily deltas across the month from hourly docs
      let monthlyTotal = 0;
      const weekSums: Map<string, number> = new Map();
      for (let d = new Date(monthStart); d <= monthEnd; d.setUTCDate(d.getUTCDate() + 1)) {
        const dayTotal = await this.computeDailyDeltaFromHourly(uid, d);
        monthlyTotal += dayTotal;
        const wk = this.formatISOWeekKey(d);
        weekSums.set(wk, (weekSums.get(wk) || 0) + dayTotal);
      }

      // Average weekly within the month (ISO weeks overlapping the month)
      const weeksInMonth = Math.max(1, weekSums.size);
      const avgWeekly = monthlyTotal / weeksInMonth;

      // Peak week among overlapping weeks
      let peakVal = 0; let peakWeekLabel = '';
      for (const [wk, sum] of weekSums.entries()) {
        if (sum > peakVal) { peakVal = sum; peakWeekLabel = wk; }
      }

      return {
        totalValue: Number(monthlyTotal.toFixed(6)),
        totalLabel: 'Monthly Total',
        avgValue: Number(avgWeekly.toFixed(6)),
        avgLabel: 'Avg Weekly',
        peakValue: Number(peakVal.toFixed(6)),
        peakLabel: 'Peak Week',
        peakDetail: peakWeekLabel || undefined,
      };
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return this.getEmptySummary();
    }
  }

  // Compute a day's delta (kWh) from hourly docs by summing hourly deltas; if missing, compute from totalEnergyAtEnd with baseline (prev day 23:00)
  private async computeDailyDeltaFromHourly(uid: string, dateUTC: Date): Promise<number> {
    const yKey = this.dateKeyUTC(dateUTC);
    let total = 0;
    let prevEnd: number | undefined;
    for (let h = 0; h < 24; h++) {
      const refHour = doc(this.db, `users/${uid}/historical/root/hourly/${yKey}/hours/${this.pad2(h)}`);
      const snap = await getDoc(refHour);
      if (!snap.exists()) continue;
      const data: any = snap.data();
      if (typeof data?.deltaKWh === 'number') {
        total += Math.max(0, Number(data.deltaKWh));
        if (typeof data?.totalEnergyAtEnd === 'number') prevEnd = Number(data.totalEnergyAtEnd);
      } else if (typeof data?.totalEnergyAtEnd === 'number') {
        const end = Number(data.totalEnergyAtEnd);
        if (prevEnd !== undefined) {
          total += Math.max(0, end - prevEnd);
        } else {
          // Baseline from previous day 23:00
          const prev = new Date(dateUTC); prev.setUTCDate(prev.getUTCDate() - 1);
          const prevRef = doc(this.db, `users/${uid}/historical/root/hourly/${this.dateKeyUTC(prev)}/hours/23`);
          const prevSnap = await getDoc(prevRef);
          const base = prevSnap.exists() ? (prevSnap.data() as any)?.totalEnergyAtEnd : undefined;
          if (typeof base === 'number') total += Math.max(0, end - Number(base));
        }
        prevEnd = end;
      }
    }
    return total;
  }
  
  /**
   * Get peak energy from start of day until now
   */
  // Removed simulated peak helper; realtime peak now reads hourly docs
  
  /**
   * Get peak hour of a specific day
   */
  // Removed simulated daily peak; daily peak computed from hourly docs
  
  /**
   * Get peak day of a week
   */
  // Removed simulated weekly peak; weekly peak computed from daily docs
  
  /**
   * Get peak week of a month
   */
  // Removed simulated monthly peak; monthly peak computed from weekly docs
  
  /**
   * Get empty summary data as fallback
   */
  private getEmptySummary(): SummaryCardData {
    return {
      totalValue: 0,
      totalLabel: 'Total',
      avgValue: 0,
      avgLabel: 'Average',
      peakValue: 0,
      peakLabel: 'Peak',
      peakDetail: ''
    };
  }
}

export const energyCalculationService = new EnergyCalculationService();
