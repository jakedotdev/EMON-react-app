import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { SensorReadingModel } from '../../models/SensorReading';

export type HistoricalPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface PeriodKeys {
  hour?: { dateKey: string; hourKey: string }; // YYYY-MM-DD, HH
  day?: { dateKey: string }; // YYYY-MM-DD
  week?: { weekKey: string; rangeLabel: string }; // YYYY-Www, e.g. 2025-W14
  month?: { monthKey: string }; // YYYY-MM
}

export class HistoricalDataStoreService {
  private db = getFirestore();

  // Main entry: decide and persist boundaries if crossed
  async capturePeriodics(uid: string, sensors: { [key: string]: SensorReadingModel }): Promise<void> {
    const tz = await this.getUserTimezone(uid);
    const now = this.nowInTimezone(tz);
    const totalEnergy = this.computeTotalEnergyKWh(sensors);

    const keys = this.getPeriodKeys(now, tz);

    // Hourly at HH:00
    if (now.getUTCMinutes() === 0) {
      if (keys.hour) {
        await this.persistDelta(uid, 'hourly', keys, totalEnergy, tz);
      }
    }

    // Daily at 00:00 (start of day). The delta corresponds to prior full day consumption.
    const isStartOfDay = now.getUTCHours() === 0 && now.getUTCMinutes() === 0;
    if (isStartOfDay) {
      await this.persistDelta(uid, 'daily', keys, totalEnergy, tz);
      // Weekly only at start of ISO week (Monday 00:00)
      const isMonday = (now.getUTCDay() || 7) === 1;
      if (isMonday) {
        await this.persistDelta(uid, 'weekly', keys, totalEnergy, tz);
      }
      // Monthly only on day 1 at 00:00
      if (now.getUTCDate() === 1) {
        await this.persistDelta(uid, 'monthly', keys, totalEnergy, tz);
      }
    }
  }

  // Persist a delta document for the given period using deterministic IDs to avoid duplicates
  private async persistDelta(
    uid: string,
    period: HistoricalPeriod,
    keys: PeriodKeys,
    currentTotalKWh: number,
    tz: string
  ): Promise<void> {
    const refs = this.getDocRefs(uid, period, keys);
    if (!refs) return;

    const { currentDocRef, previousDocRef } = refs;

    // Avoid duplicate writes if already exists
    const currentSnap = await getDoc(currentDocRef);
    if (currentSnap.exists()) return;

    // Previous period total
    const prevSnap = previousDocRef ? await getDoc(previousDocRef) : null;
    const prevTotal = prevSnap?.data()?.totalEnergyAtEnd ?? (await this.lookupLastAny(uid, period, keys)) ?? 0;

    const deltaKWh = Math.max(0, currentTotalKWh - prevTotal);

    const baseDoc: any = {
      totalEnergyAtEnd: Number(currentTotalKWh.toFixed(6)),
      deltaKWh: Number(deltaKWh.toFixed(6)),
      timezone: tz,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    // Include weekly range label if applicable; ensure it matches the target (previous) week
    if (period === 'weekly') {
      const prevWeekKey = keys.week?.weekKey ? this.shiftWeekKey(keys.week.weekKey, -1) : undefined;
      if (prevWeekKey) {
        baseDoc.rangeLabel = this.formatWeekRangeLabelFromWeekKey(prevWeekKey);
      }
    }
    await setDoc(currentDocRef, baseDoc);
  }

  // Computes references for current and previous documents for delta calculation
  private getDocRefs(
    uid: string,
    period: HistoricalPeriod,
    keys: PeriodKeys
  ):
    | { currentDocRef: ReturnType<typeof doc>; previousDocRef?: ReturnType<typeof doc> }
    | undefined {
    const userRoot = `users/${uid}/historical`;
    switch (period) {
      case 'hourly': {
        if (!keys.hour) return undefined;
        const { dateKey, hourKey } = keys.hour;
        const current = doc(this.db, `${userRoot}/hourly/${dateKey}`, hourKey);
        // Previous hour: if 00, use yesterday's 23:00; otherwise same date previous hour
        let prevRef;
        if (hourKey === '00') {
          const prevDateKey = this.shiftDateKey(dateKey, -1);
          prevRef = doc(this.db, `${userRoot}/hourly/${prevDateKey}`, '23');
        } else {
          const prevHour = this.pad2(parseInt(hourKey) - 1);
          prevRef = doc(this.db, `${userRoot}/hourly/${dateKey}`, prevHour);
        }
        return { currentDocRef: current, previousDocRef: prevRef };
      }
      case 'daily': {
        if (!keys.day) return undefined;
        const { dateKey } = keys.day;
        // We persist at 00:00 for the prior full day, so label current doc as yesterday
        const yDayKey = this.shiftDateKey(dateKey, -1);
        const current = doc(this.db, `${userRoot}/daily`, yDayKey);
        // Previous baseline is day before yesterday
        const prevRef = doc(this.db, `${userRoot}/daily`, this.shiftDateKey(yDayKey, -1));
        return { currentDocRef: current, previousDocRef: prevRef };
      }
      case 'weekly': {
        if (!keys.week) return undefined;
        const { weekKey } = keys.week;
        // Persist for previous week, and baseline is two weeks back
        const prevWeekKey = this.shiftWeekKey(weekKey, -1);
        const current = doc(this.db, `${userRoot}/weekly`, prevWeekKey);
        const prevRef = doc(this.db, `${userRoot}/weekly`, this.shiftWeekKey(prevWeekKey, -1));
        return { currentDocRef: current, previousDocRef: prevRef };
      }
      case 'monthly': {
        if (!keys.month) return undefined;
        const { monthKey } = keys.month;
        // Persist for previous month; baseline is month before previous
        const prevMonthKey = this.shiftMonthKey(monthKey, -1);
        const current = doc(this.db, `${userRoot}/monthly`, prevMonthKey);
        const prevRef = doc(this.db, `${userRoot}/monthly`, this.shiftMonthKey(prevMonthKey, -1));
        return { currentDocRef: current, previousDocRef: prevRef };
      }
    }
  }

  // If a previous period doc is missing (e.g., first run), try to lookup last known total
  private async lookupLastAny(
    uid: string,
    period: HistoricalPeriod,
    keys: PeriodKeys
  ): Promise<number | undefined> {
    const userRoot = `users/${uid}/historical`;
    try {
      if (period === 'hourly' && keys.hour) {
        const { dateKey, hourKey } = keys.hour;
        let h = parseInt(hourKey) - 1;
        while (h >= 0) {
          const ref = doc(this.db, `${userRoot}/hourly/${dateKey}`, this.pad2(h));
          const snap = await getDoc(ref);
          if (snap.exists()) return snap.data()?.totalEnergyAtEnd as number;
          h--;
        }
        // try yesterday 23:00
        const yDay = this.shiftDateKey(dateKey, -1);
        const ref = doc(this.db, `${userRoot}/hourly/${yDay}`, '23');
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data()?.totalEnergyAtEnd as number;
      } else if (period === 'daily' && keys.day) {
        const yDay = this.shiftDateKey(keys.day.dateKey, -1);
        const ref = doc(this.db, `${userRoot}/daily`, yDay);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data()?.totalEnergyAtEnd as number;
      } else if (period === 'weekly' && keys.week) {
        const prevWeekKey = this.shiftWeekKey(keys.week.weekKey, -1);
        const ref = doc(this.db, `${userRoot}/weekly`, prevWeekKey);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data()?.totalEnergyAtEnd as number;
      } else if (period === 'monthly' && keys.month) {
        const prevMonthKey = this.shiftMonthKey(keys.month.monthKey, -1);
        const ref = doc(this.db, `${userRoot}/monthly`, prevMonthKey);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data()?.totalEnergyAtEnd as number;
      }
    } catch (e) {
      // Ignore and fallback
    }
    return undefined;
  }

  // Compute user's preferred timezone from profile document
  private async getUserTimezone(uid: string): Promise<string> {
    // Expecting profile at users/{uid}
    const profileRef = doc(this.db, 'users', uid);
    const snap = await getDoc(profileRef);
    const tz = snap.data()?.preferredTimezone || 'UTC';
    return tz as string;
  }

  private computeTotalEnergyKWh(sensors: { [key: string]: SensorReadingModel }): number {
    return Object.values(sensors).reduce((sum, s) => {
      const val = typeof (s as any).getEnergyInKWh === 'function' ? (s as any).getEnergyInKWh() : (s as any).energy ?? 0;
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }

  // Build composite keys in user's timezone
  private getPeriodKeys(now: Date, tz: string): PeriodKeys {
    const dateKey = this.formatDateKey(now, tz);
    const hourKey = this.pad2(now.getUTCHours());
    const weekKey = this.formatISOWeekKey(now);
    const rangeLabel = this.formatWeekRangeLabel(now, tz);
    const monthKey = `${now.getUTCFullYear()}-${this.pad2(now.getUTCMonth() + 1)}`;
    return {
      hour: { dateKey, hourKey },
      day: { dateKey },
      week: { weekKey, rangeLabel },
      month: { monthKey },
    };
  }

  private nowInTimezone(tz: string): Date {
    // JS Date is always UTC internally; to align hours per tz, we create a date and use Intl to derive parts
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  }

  private formatDateKey(date: Date, _tz: string): string {
    return `${date.getUTCFullYear()}-${this.pad2(date.getUTCMonth() + 1)}-${this.pad2(date.getUTCDate())}`;
  }

  private pad2(n: number): string {
    return String(n).padStart(2, '0');
  }

  private shiftDateKey(dateKey: string, deltaDays: number): string {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + deltaDays);
    return `${dt.getUTCFullYear()}-${this.pad2(dt.getUTCMonth() + 1)}-${this.pad2(dt.getUTCDate())}`;
  }

  private formatISOWeekKey(date: Date): string {
    // ISO week number
    const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  private formatWeekRangeLabel(date: Date, tz: string): string {
    const day = new Date(date);
    const weekday = day.getUTCDay() || 7; // 1..7
    const monday = new Date(day);
    monday.setUTCDate(day.getUTCDate() - (weekday - 1));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const fmt = (d: Date) => `${d.getUTCFullYear()}-${this.pad2(d.getUTCMonth() + 1)}-${this.pad2(d.getUTCDate())}`;
    return `${fmt(monday)} - ${fmt(sunday)}`;
  }

  private formatWeekRangeLabelFromWeekKey(weekKey: string): string {
    // Convert ISO week key back to Monday date and compute range label
    const [yearStr, wStr] = weekKey.split('-W');
    const year = Number(yearStr);
    const week = Number(wStr);
    // Thursday of ISO week
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const weekStart = new Date(jan4);
    weekStart.setUTCDate(jan4.getUTCDate() + (week - 1) * 7 - ((jan4.getUTCDay() || 7) - 1));
    const monday = weekStart; // already Monday
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const fmt = (d: Date) => `${d.getUTCFullYear()}-${this.pad2(d.getUTCMonth() + 1)}-${this.pad2(d.getUTCDate())}`;
    return `${fmt(monday)} - ${fmt(sunday)}`;
  }

  private shiftWeekKey(weekKey: string, delta: number): string {
    const [yearStr, wStr] = weekKey.split('-W');
    const year = Number(yearStr);
    const week = Number(wStr);
    // Convert to date: Thursday of ISO week
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const weekStart = new Date(jan4);
    weekStart.setUTCDate(jan4.getUTCDate() + (week - 1 + delta) * 7 - ((jan4.getUTCDay() || 7) - 1));
    const newKey = this.formatISOWeekKey(weekStart);
    return newKey;
  }

  private shiftMonthKey(monthKey: string, delta: number): string {
    const [y, m] = monthKey.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${dt.getUTCFullYear()}-${this.pad2(dt.getUTCMonth() + 1)}`;
  }
}

export const historicalDataStoreService = new HistoricalDataStoreService();
