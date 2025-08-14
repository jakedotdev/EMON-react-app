import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// Seeds July (2025-07) mock energy deltas into Firestore under root-based schema:
// users/{uid}/historical/root/{hourly|daily|weekly|monthly}/...
// Data is timezone-aware using the user's preferredTimezone from profile.
class MockDataGeneratorService {
  private db = getFirestore();

  async generateJuly2025(uid?: string): Promise<void> {
    const userId = uid || getAuth().currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');

    const tz = await this.getUserTimezone(userId);

    // Build July 2025 range in user's timezone (inclusive): 2025-07-01..2025-07-31
    const julyStart = this.makeTzDate(tz, 2025, 7, 1, 0, 0); // 1-based month
    const julyEnd = this.makeTzDate(tz, 2025, 7, 31, 23, 59);

    const weeklyTotals = new Map<string, number>();
    let monthlyTotal = 0;

    // Iterate per day
    for (let day = new Date(julyStart); day <= julyEnd; day = this.addTzDays(day, 1)) {
      const dateKey = this.dateKeyUTC(day);
      let dayTotal = 0;

      // Iterate 24 hours
      for (let h = 0; h < 24; h++) {
        const hourVal = this.hourlyProfileKWh(h, day);
        dayTotal += hourVal;
        const hourKey = this.pad2(h);
        const hourRef = doc(this.db, `users/${userId}/historical/root/hourly/${dateKey}/hours/${hourKey}`);
        await setDoc(hourRef, {
          deltaKWh: Number(hourVal.toFixed(6)),
          timezone: tz,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Daily doc
      const dailyRef = doc(this.db, `users/${userId}/historical/root/daily/${dateKey}`);
      await setDoc(dailyRef, {
        deltaKWh: Number(dayTotal.toFixed(6)),
        timezone: tz,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Accumulate
      monthlyTotal += dayTotal;
      const weekKey = this.formatISOWeekKey(day);
      weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + dayTotal);
    }

    // Weekly docs with rangeLabel
    for (const [weekKey, total] of weeklyTotals.entries()) {
      const weeklyRef = doc(this.db, `users/${userId}/historical/root/weekly/${weekKey}`);
      await setDoc(weeklyRef, {
        deltaKWh: Number(total.toFixed(6)),
        rangeLabel: this.formatWeekRangeLabelFromWeekKey(weekKey),
        timezone: tz,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Monthly doc for 2025-07
    const monthlyRef = doc(this.db, `users/${userId}/historical/root/monthly/2025-07`);
    await setDoc(monthlyRef, {
      deltaKWh: Number(monthlyTotal.toFixed(6)),
      timezone: tz,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Seed August 2025 from Aug 1st 00:00 up to "yesterday" (end of day) in user's timezone
  async generateAugust2025UntilYesterday(uid?: string): Promise<void> {
    const userId = uid || getAuth().currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');

    const tz = await this.getUserTimezone(userId);
    const now = this.nowInTimezone(tz);

    // Determine yesterday in user's timezone
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(23, 59, 0, 0);

    // Bound end within August 2025
    const augStart = this.makeTzDate(tz, 2025, 8, 1, 0, 0);
    const augEndMax = this.makeTzDate(tz, 2025, 8, 31, 23, 59);
    const rangeEnd = yesterday < augEndMax ? yesterday : augEndMax;

    if (rangeEnd < augStart) {
      // Nothing to seed yet
      return;
    }

    const weeklyTotals = new Map<string, number>();
    let monthlyTotal = 0;

    // Iterate per day (full days only)
    const dayWalk = new Date(augStart);
    while (dayWalk <= rangeEnd) {
      const dateKey = this.dateKeyUTC(dayWalk);
      // Skip this day entirely if a daily doc already exists
      const existingDailySnap = await getDoc(doc(this.db, `users/${userId}/historical/root/daily/${dateKey}`));
      if (existingDailySnap.exists()) {
        // advance to next day
        dayWalk.setUTCDate(dayWalk.getUTCDate() + 1);
        dayWalk.setUTCHours(0, 0, 0, 0);
        continue;
      }

      let dayTotal = 0;
      for (let h = 0; h < 24; h++) {
        const hourVal = this.hourlyProfileKWh(h, dayWalk);
        dayTotal += hourVal;
        const hourKey = this.pad2(h);
        const hourRef = doc(this.db, `users/${userId}/historical/root/hourly/${dateKey}/hours/${hourKey}`);
        const hourSnap = await getDoc(hourRef);
        if (!hourSnap.exists()) {
          await setDoc(hourRef, {
            deltaKWh: Number(hourVal.toFixed(6)),
            timezone: tz,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Daily doc
      const dailyRef = doc(this.db, `users/${userId}/historical/root/daily/${dateKey}`);
      await setDoc(dailyRef, {
        deltaKWh: Number(dayTotal.toFixed(6)),
        timezone: tz,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Accumulate
      monthlyTotal += dayTotal;
      const weekKey = this.formatISOWeekKey(dayWalk);
      weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + dayTotal);

      // next day
      dayWalk.setUTCDate(dayWalk.getUTCDate() + 1);
      dayWalk.setUTCHours(0, 0, 0, 0);
    }

    // Weekly docs (add to existing if present)
    for (const [weekKey, total] of weeklyTotals.entries()) {
      const weeklyRef = doc(this.db, `users/${userId}/historical/root/weekly/${weekKey}`);
      const weeklySnap = await getDoc(weeklyRef);
      const existing = (weeklySnap.exists() ? (weeklySnap.data()?.deltaKWh as number) : 0) || 0;
      await setDoc(weeklyRef, {
        deltaKWh: Number((existing + total).toFixed(6)),
        rangeLabel: this.formatWeekRangeLabelFromWeekKey(weekKey),
        timezone: tz,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Monthly-to-date doc for 2025-08 (add to existing if present)
    const monthlyRef = doc(this.db, `users/${userId}/historical/root/monthly/2025-08`);
    const monthlySnap = await getDoc(monthlyRef);
    const existingMonthly = (monthlySnap.exists() ? (monthlySnap.data()?.deltaKWh as number) : 0) || 0;
    await setDoc(monthlyRef, {
      deltaKWh: Number((existingMonthly + monthlyTotal).toFixed(6)),
      timezone: tz,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Seed today's hours up to the last completed hour (do not create a daily doc for today)
    const todayKey = this.dateKeyUTC(now);
    const lastCompletedHour = Math.max(0, now.getUTCHours() - 1);
    for (let h = 0; h <= lastCompletedHour; h++) {
      const hourKey = this.pad2(h);
      const hourRef = doc(this.db, `users/${userId}/historical/root/hourly/${todayKey}/hours/${hourKey}`);
      const hourSnap = await getDoc(hourRef);
      if (!hourSnap.exists()) {
        const hourVal = this.hourlyProfileKWh(h, now);
        await setDoc(hourRef, {
          deltaKWh: Number(hourVal.toFixed(6)),
          timezone: tz,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  // Seed June 2025 from June 1st 00:00 up to current time (bounded to June end)
  async generateJune2025UpToNow(uid?: string): Promise<void> {
    const userId = uid || getAuth().currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');

    const tz = await this.getUserTimezone(userId);
    const now = this.nowInTimezone(tz);

    // Build June 2025 range in user's timezone (inclusive)
    const juneStart = this.makeTzDate(tz, 2025, 6, 1, 0, 0);
    const juneEndMax = this.makeTzDate(tz, 2025, 6, 30, 23, 59);
    const rangeEnd = now < juneEndMax ? now : juneEndMax;

    const weeklyTotals = new Map<string, number>();
    let monthlyTotal = 0;

    // Iterate per day
    const dayWalk = new Date(juneStart);
    while (dayWalk <= rangeEnd) {
      const dateKey = this.dateKeyUTC(dayWalk);
      let dayTotal = 0;

      // For last (partial) day, only seed up to current hour in tz
      const isSameDayAsNow = dayWalk.getUTCFullYear() === rangeEnd.getUTCFullYear() &&
        dayWalk.getUTCMonth() === rangeEnd.getUTCMonth() &&
        dayWalk.getUTCDate() === rangeEnd.getUTCDate();
      const lastHour = isSameDayAsNow ? rangeEnd.getUTCHours() : 23;

      for (let h = 0; h <= lastHour; h++) {
        const hourVal = this.hourlyProfileKWh(h, dayWalk);
        dayTotal += hourVal;
        const hourKey = this.pad2(h);
        const hourRef = doc(this.db, `users/${userId}/historical/root/hourly/${dateKey}/hours/${hourKey}`);
        await setDoc(hourRef, {
          deltaKWh: Number(hourVal.toFixed(6)),
          timezone: tz,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Daily doc (partial day still writes accumulated hours up to now)
      const dailyRef = doc(this.db, `users/${userId}/historical/root/daily/${dateKey}`);
      await setDoc(dailyRef, {
        deltaKWh: Number(dayTotal.toFixed(6)),
        timezone: tz,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Accumulate
      monthlyTotal += dayTotal;
      const weekKey = this.formatISOWeekKey(dayWalk);
      weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + dayTotal);

      // next day
      dayWalk.setUTCDate(dayWalk.getUTCDate() + 1);
      // normalize to 00:00
      dayWalk.setUTCHours(0, 0, 0, 0);
    }

    // Weekly docs for weeks touched within the range
    for (const [weekKey, total] of weeklyTotals.entries()) {
      const weeklyRef = doc(this.db, `users/${userId}/historical/root/weekly/${weekKey}`);
      await setDoc(weeklyRef, {
        deltaKWh: Number(total.toFixed(6)),
        rangeLabel: this.formatWeekRangeLabelFromWeekKey(weekKey),
        timezone: tz,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Monthly doc for 2025-06 (total of seeded hours)
    const monthlyRef = doc(this.db, `users/${userId}/historical/root/monthly/2025-06`);
    await setDoc(monthlyRef, {
      deltaKWh: Number(monthlyTotal.toFixed(6)),
      timezone: tz,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  private nowInTimezone(tz: string): Date {
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


  private async getUserTimezone(uid: string): Promise<string> {
    // Use auth profile document
    const ref = doc(this.db, 'users', uid);
    const snap = await (await import('firebase/firestore')).getDoc(ref);
    return (snap.data()?.preferredTimezone as string) || 'UTC';
  }

  // Create a Date that represents the given Y-M-D H:M in the user's timezone, then convert to a UTC Date
  private makeTzDate(tz: string, year: number, month1: number, day: number, hour: number, minute: number): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(Date.UTC(year, month1 - 1, day, hour, minute)));
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
    const y = get('year');
    const m = get('month');
    const d = get('day');
    const h = get('hour');
    const min = get('minute');
    return new Date(Date.UTC(y, m - 1, d, h, min, 0, 0));
  }

  private addTzDays(date: Date, delta: number): Date {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + delta);
    return d;
  }

  private pad2(n: number): string { return String(n).padStart(2, '0'); }

  private dateKeyUTC(date: Date): string {
    return `${date.getUTCFullYear()}-${this.pad2(date.getUTCMonth() + 1)}-${this.pad2(date.getUTCDate())}`;
  }

  private formatISOWeekKey(date: Date): string {
    const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) as Date & { valueOf: () => number };
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1)) as Date & { valueOf: () => number };
    const weekNo = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${this.pad2(weekNo)}`;
  }

  private formatWeekRangeLabelFromWeekKey(weekKey: string): string {
    const [yearStr, wStr] = weekKey.split('-W');
    const year = Number(yearStr);
    const week = Number(wStr);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const weekStart = new Date(jan4);
    weekStart.setUTCDate(jan4.getUTCDate() + (week - 1) * 7 - ((jan4.getUTCDay() || 7) - 1));
    const monday = weekStart;
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const fmt = (d: Date) => `${d.getUTCFullYear()}-${this.pad2(d.getUTCMonth() + 1)}-${this.pad2(d.getUTCDate())}`;
    return `${fmt(monday)} - ${fmt(sunday)}`;
  }

  // Simple hourly profile with evening peaks; add slight weekday variance using date
  private hourlyProfileKWh(hour: number, date: Date): number {
    const base = 0.3; // base kWh per hour
    const eveningBoost = (hour >= 18 && hour <= 22) ? 0.9 : 0; // peak hours
    const morningBump = (hour >= 7 && hour <= 9) ? 0.2 : 0;
    const weekend = [0,6].includes(date.getUTCDay()); // Sun=0, Sat=6
    const weekendAdj = weekend ? 0.15 : 0;
    return base + eveningBoost + morningBump + weekendAdj;
  }
}

export const mockDataGeneratorService = new MockDataGeneratorService();
