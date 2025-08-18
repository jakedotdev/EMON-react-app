import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { SensorReadingModel } from '../../models/SensorReading';
import { deviceService } from '../devices/deviceService';

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
    // Use filtered total: only sensors from user's devices that have registered appliances
    const totalEnergy = await this.computeFilteredTotalEnergyKWh(uid, sensors);

    const keys = this.getPeriodKeys(now, tz);

    // Hourly persistence
    if (keys.hour) {
      const isTopOfHour = now.getUTCMinutes() === 0;
      if (isTopOfHour) {
        // Finalize the previous hour with delta and totalEnergyAtEnd
        await this.persistDelta(uid, 'hourly', keys, totalEnergy, tz);
      } else {
        // Provisional upsert for the current hour so realtime analytics can compute Avg/Peak
        await this.upsertProvisionalHour(uid, keys, totalEnergy, tz);
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

  // Backfill missing daily docs up to yesterday using hourly 23:00 totals
  public async backfillMissingDaily(uid: string): Promise<{ created: string[]; skipped: string[]; missingHourlies: string[] }> {
    const created: string[] = [];
    const skipped: string[] = [];
    const missingHourlies: string[] = [];
    try {
      const tz = await this.getUserTimezone(uid);
      const now = this.nowInTimezone(tz);
      // yesterday key in user's timezone
      const yesterday = new Date(now);
      yesterday.setUTCDate(now.getUTCDate() - 1);
      const yesterdayKey = this.formatDateKey(yesterday, tz);

      const userRoot = `users/${uid}/historical`;
      const dailyCol = collection(this.db, `${userRoot}/root/daily`);
      // Find the most recent daily by createdAt
      let lastKey: string | undefined;
      try {
        const q = query(dailyCol, orderBy('createdAt', 'desc'), limit(1));
        const snap = await getDocs(q);
        snap.forEach(docSnap => { lastKey = docSnap.id; });
      } catch (_e) {
        // Fallback: scan all and pick max id (lexicographically works for YYYY-MM-DD)
        const snap = await getDocs(dailyCol);
        snap.forEach(docSnap => { if (!lastKey || docSnap.id > lastKey!) lastKey = docSnap.id; });
      }

      // If none exist, we cannot derive chain without a baseline; attempt to use earliest available hourly to seed
      if (!lastKey) {
        // Try to find an earliest day that has hour 23
        // We'll conservatively stop if we cannot find yesterday's hourlies either
        lastKey = undefined;
      }

      // Start from the day after the lastKey (or, if undefined, do nothing unless yesterday hourly exists with a prior baseline)
      const datesToFill: string[] = [];
      const startKey = lastKey ? this.shiftDateKey(lastKey, 1) : undefined;
      if (startKey) {
        let cursor = startKey;
        while (cursor <= yesterdayKey) {
          datesToFill.push(cursor);
          cursor = this.shiftDateKey(cursor, 1);
        }
      } else {
        // No existing daily docs: we can only create yesterday if both yesterday 23:00 total and day-before-yesterday 23:00 exist
        datesToFill.push(yesterdayKey);
      }

      // Determine previous total baseline
      let prevTotal: number | undefined;
      if (lastKey) {
        const prevRef = doc(this.db, `${userRoot}/root/daily`, lastKey);
        const prevSnap = await getDoc(prevRef);
        prevTotal = (prevSnap.exists() ? (prevSnap.data() as any)?.totalEnergyAtEnd : undefined) as number | undefined;
        if (prevTotal === undefined) {
          // try fallback from hourly 23:00 of lastKey
          const hRef = doc(this.db, `${userRoot}/root/hourly/${lastKey}/hours/23`);
          const hSnap = await getDoc(hRef);
          prevTotal = (hSnap.exists() ? (hSnap.data() as any)?.totalEnergyAtEnd : undefined) as number | undefined;
        }
      }

      for (const dKey of datesToFill) {
        // Skip if daily already exists
        const dailyRef = doc(this.db, `${userRoot}/root/daily`, dKey);
        const dailySnap = await getDoc(dailyRef);
        if (dailySnap.exists()) { skipped.push(dKey); continue; }

        // Need end-of-day total from hourly 23:00
        const hourRef = doc(this.db, `${userRoot}/root/hourly/${dKey}/hours/23`);
        const hourSnap = await getDoc(hourRef);
        const eodTotal = (hourSnap.exists() ? (hourSnap.data() as any)?.totalEnergyAtEnd : undefined) as number | undefined;
        if (eodTotal === undefined) { missingHourlies.push(dKey); continue; }

        // If prevTotal is undefined, try to fetch day-1 23:00 total
        let baseline = prevTotal;
        if (baseline === undefined) {
          const prevKey = this.shiftDateKey(dKey, -1);
          const prevHour = doc(this.db, `${userRoot}/root/hourly/${prevKey}/hours/23`);
          const prevHourSnap = await getDoc(prevHour);
          baseline = (prevHourSnap.exists() ? (prevHourSnap.data() as any)?.totalEnergyAtEnd : undefined) as number | undefined;
          if (baseline === undefined) {
            // cannot compute delta reliably
            missingHourlies.push(dKey);
            continue;
          }
        }

        const deltaKWh = Math.max(0, eodTotal - baseline);
        await setDoc(dailyRef, {
          totalEnergyAtEnd: Number(eodTotal.toFixed(6)),
          deltaKWh: Number(deltaKWh.toFixed(6)),
          timezone: tz,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        // advance baseline
        prevTotal = eodTotal;
        created.push(dKey);
      }

      return { created, skipped, missingHourlies };
    } catch (_e) {
      return { created, skipped, missingHourlies };
    }
  }

  // Backfill today's missing hourly documents with a random but increasing series up to current total.
  // Writes provisional docs (isPartial: true) from 01:00 up to current hour in the user's timezone.
  public async backfillTodayHourlyProvisionalRandom(
    uid: string,
    sensors: { [key: string]: SensorReadingModel }
  ): Promise<{ created: string[]; skipped: string[] }> {
    const tz = await this.getUserTimezone(uid);
    const now = this.nowInTimezone(tz);
    const keysNow = this.getPeriodKeys(now, tz);
    if (!keysNow.hour) return { created: [], skipped: [] };

    const currentHour = parseInt(keysNow.hour.hourKey, 10);
    if (currentHour <= 0) return { created: [], skipped: [] };

    // Use filtered total aligned with dashboard logic
    const currentTotal = await this.computeFilteredTotalEnergyKWh(uid, sensors);

    const created: string[] = [];
    const skipped: string[] = [];
    const userRoot = `users/${uid}/historical/root/hourly/${keysNow.hour.dateKey}/hours`;

    // Generate an increasing target series from ~75% to ~100% of current total with small randomness
    let prev = 0;
    for (let h = 1; h <= currentHour; h++) {
      const hourKey = this.pad2(h);
      const ref = doc(this.db, `${userRoot}/${hourKey}`);
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data() as any;
          // If already finalized (has deltaKWh) or explicitly non-partial, skip
          if (typeof d?.deltaKWh === 'number' || d?.isPartial === false) {
            skipped.push(hourKey);
            continue;
          }
        }

        // fraction of progress in the day (1..currentHour)
        const frac = h / Math.max(1, currentHour);
        const base = 0.75 + 0.25 * frac; // 75% -> 100%
        const jitter = (Math.random() * 0.06) - 0.03; // +/-3%
        let val = currentTotal * Math.max(0, base + jitter);
        // enforce non-decreasing and cap to currentTotal
        val = Math.min(currentTotal, Math.max(prev, val));
        prev = val;

        await setDoc(
          ref,
          {
            totalEnergyAtEnd: Number(val.toFixed(6)),
            timezone: tz,
            isPartial: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        created.push(hourKey);
      } catch (_e) {
        skipped.push(hourKey);
      }
    }

    return { created, skipped };
  }

  // Upsert provisional current-hour document with running total. This ensures today's hours exist
  // even if the app started mid-hour. The top-of-hour finalize will overwrite with delta and totals.
  private async upsertProvisionalHour(
    uid: string,
    keys: PeriodKeys,
    currentTotalKWh: number,
    tz: string
  ): Promise<void> {
    if (!keys.hour) return;
    const userRoot = `users/${uid}/historical`;
    const { dateKey, hourKey } = keys.hour;
    const currentRef = doc(this.db, `${userRoot}/root/hourly/${dateKey}/hours/${hourKey}`);
    try {
      // Determine current minute in user's timezone
      const now = this.nowInTimezone(tz);
      const minute = now.getUTCMinutes(); // 0..59 in user's tz context
      const bucketIndex = Math.floor(minute / 10) + 1; // 1..6

      // Read existing doc to accumulate per-bucket deltas
      const snap = await getDoc(currentRef);
      const data = snap.exists() ? (snap.data() as any) : {};
      const buckets: Record<string, number> = { ...(data.buckets || {}) };
      const lastSeenTotal: number = typeof data.lastSeenTotal === 'number' ? data.lastSeenTotal : currentTotalKWh;

      // Compute delta since last seen and attribute to current bucket
      const delta = Math.max(0, Number((currentTotalKWh - lastSeenTotal).toFixed(6)));
      const bKey = `b${bucketIndex}`; // b1..b6
      const prevVal = typeof buckets[bKey] === 'number' ? buckets[bKey] : 0;
      const newVal = Number((prevVal + delta).toFixed(6));
      buckets[bKey] = newVal;

      await setDoc(
        currentRef,
        {
          totalEnergyAtEnd: Number(currentTotalKWh.toFixed(6)),
          timezone: tz,
          isPartial: true,
          lastSeenTotal: Number(currentTotalKWh.toFixed(6)),
          lastSeenMinute: minute,
          buckets, // { b1..b6: kWh consumed within each 10-min bucket so far }
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (_e) {
      // best-effort; ignore transient errors
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
    const rootDocPath = `${userRoot}/root`;
    switch (period) {
      case 'hourly': {
        if (!keys.hour) return undefined;
        const { dateKey, hourKey } = keys.hour;
        const current = doc(this.db, `${rootDocPath}/hourly/${dateKey}/hours/${hourKey}`);
        // Previous hour baseline
        const prevHourKey = this.previousHourKey(dateKey, hourKey);
        const prevRef = prevHourKey
          ? doc(this.db, `${rootDocPath}/hourly/${prevHourKey.dateKey}/hours/${prevHourKey.hourKey}`)
          : undefined;
        return { currentDocRef: current, previousDocRef: prevRef };
      }
      case 'daily': {
        if (!keys.day) return undefined;
        const { dateKey } = keys.day;
        // We persist at 00:00 for the prior full day, so label current doc as yesterday
        const yDayKey = this.shiftDateKey(dateKey, -1);
        const current = doc(this.db, `${rootDocPath}/daily`, yDayKey);
        // Previous baseline is day before yesterday
        const prevRef = doc(this.db, `${rootDocPath}/daily`, this.shiftDateKey(yDayKey, -1));
        return { currentDocRef: current, previousDocRef: prevRef };
      }
      case 'weekly': {
        if (!keys.week) return undefined;
        const { weekKey } = keys.week;
        // Persist for previous week, and baseline is two weeks back
        const prevWeekKey = this.shiftWeekKey(weekKey, -1);
        const current = doc(this.db, `${rootDocPath}/weekly`, prevWeekKey);
        const prevRef = doc(this.db, `${rootDocPath}/weekly`, this.shiftWeekKey(prevWeekKey, -1));
        return { currentDocRef: current, previousDocRef: prevRef };
      }
      case 'monthly': {
        if (!keys.month) return undefined;
        const { monthKey } = keys.month;
        // Persist for previous month; baseline is month before previous
        const prevMonthKey = this.shiftMonthKey(monthKey, -1);
        const current = doc(this.db, `${rootDocPath}/monthly`, prevMonthKey);
        const prevRef = doc(this.db, `${rootDocPath}/monthly`, this.shiftMonthKey(prevMonthKey, -1));
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
          const ref = doc(
            this.db,
            `${userRoot}/root/hourly/${dateKey}/hours/${this.pad2(h)}`
          );
          const snap = await getDoc(ref);
          if (snap.exists()) return snap.data()?.totalEnergyAtEnd as number;
          h--;
        }
        // try yesterday 23:00
        const yDay = this.shiftDateKey(dateKey, -1);
        const ref = doc(this.db, `${userRoot}/root/hourly/${yDay}/hours/23`);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data()?.totalEnergyAtEnd as number;
      } else if (period === 'daily' && keys.day) {
        const yDay = this.shiftDateKey(keys.day.dateKey, -1);
        const ref = doc(this.db, `${userRoot}/root/daily`, yDay);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data()?.totalEnergyAtEnd as number;
      } else if (period === 'weekly' && keys.week) {
        const prevWeekKey = this.shiftWeekKey(keys.week.weekKey, -1);
        const ref = doc(this.db, `${userRoot}/root/weekly`, prevWeekKey);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data()?.totalEnergyAtEnd as number;
      } else if (period === 'monthly' && keys.month) {
        const prevMonthKey = this.shiftMonthKey(keys.month.monthKey, -1);
        const ref = doc(this.db, `${userRoot}/root/monthly`, prevMonthKey);
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

  // Compute total energy (kWh) only from sensors mapped to user's devices that have registered appliances
  private async computeFilteredTotalEnergyKWh(
    uid: string,
    sensors: { [key: string]: SensorReadingModel }
  ): Promise<number> {
    try {
      const [userDevices, userAppliances] = await Promise.all([
        deviceService.getUserDevices(uid),
        deviceService.getUserAppliances(uid),
      ]);
      const deviceIdBySerial = new Map<string, string>();
      userDevices.forEach(d => {
        if (d?.serialNumber && d?.id) deviceIdBySerial.set(d.serialNumber, d.id);
      });
      const deviceIdsWithAppliances = new Set<string>(
        userAppliances.map(a => a.deviceId).filter(Boolean)
      );

      let total = 0;
      Object.values(sensors).forEach(s => {
        const serial = (s as any)?.serialNumber as string | undefined;
        if (!serial) return;
        const deviceId = deviceIdBySerial.get(serial);
        if (deviceId && deviceIdsWithAppliances.has(deviceId)) {
          const val =
            typeof (s as any).getEnergyInKWh === 'function'
              ? (s as any).getEnergyInKWh()
              : (s as any).energy ?? 0;
          total += Number.isFinite(val) ? (val as number) : 0;
        }
      });
      return total;
    } catch (_e) {
      // Fallback to unfiltered if device/appliance lookup fails
      return this.computeTotalEnergyKWh(sensors);
    }
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

  // Compute previous hour key given a dateKey (YYYY-MM-DD) and hourKey (HH)
  private previousHourKey(dateKey: string, hourKey: string): { dateKey: string; hourKey: string } | undefined {
    if (hourKey === '00') {
      const prevDateKey = this.shiftDateKey(dateKey, -1);
      return { dateKey: prevDateKey, hourKey: '23' };
    }
    const prevHour = this.pad2(parseInt(hourKey, 10) - 1);
    return { dateKey, hourKey: prevHour };
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
