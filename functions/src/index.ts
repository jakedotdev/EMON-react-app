import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

const db = admin.firestore();
const rtdb = admin.database();

// Utilities mirroring app logic
function pad2(n: number): string { return String(n).padStart(2, '0'); }

function nowInTimezone(tz: string): Date {
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

function formatDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

async function getUserTimezone(uid: string): Promise<string> {
  try {
    const snap = await db.doc(`users/${uid}`).get();
    const tz = snap.get('timezone');
    return typeof tz === 'string' && tz ? tz : 'UTC';
  } catch {
    return 'UTC';
  }
}

async function getUserSensorIds(uid: string): Promise<string[]> {
  try {
    const devicesSnap = await db.collection(`users/${uid}/devices`).get();
    const sensorIds: string[] = [];
    devicesSnap.forEach(doc => {
      const sid = doc.get('sensorId');
      if (typeof sid === 'string' && sid) sensorIds.push(sid);
    });
    return sensorIds;
  } catch {
    return [];
  }
}

async function getCurrentTotalEnergyKWh(sensorIds: string[]): Promise<number> {
  // Read RTDB root and map SensorReadings keys
  const rootSnap = await rtdb.ref('/').get();
  const rootVal = rootSnap.val() || {};
  let total = 0;
  const allowed = new Set(sensorIds);
  for (const key of Object.keys(rootVal)) {
    if (!(key === 'SensorReadings' || key.startsWith('SensorReadings_'))) continue;
    const mappedId = key === 'SensorReadings' ? 'SensorReadings_1' : key;
    if (allowed.size > 0 && !allowed.has(mappedId)) continue;
    const v = rootVal[key];
    const energy = typeof v?.energy === 'number' ? v.energy : Number(v?.energy) || 0;
    total += energy; // energy is kWh
  }
  return Number(total.toFixed(6));
}

async function upsertProvisionalHour(uid: string, tz: string, currentTotalKWh: number): Promise<void> {
  const now = nowInTimezone(tz);
  const dateKey = formatDateKey(now);
  const hourKey = pad2(now.getUTCHours());
  const minute = now.getUTCMinutes();
  const bucketIndex = Math.floor(minute / 10) + 1; // 1..6

  const hourlyRef = db.doc(`users/${uid}/historical/root/hourly/${dateKey}/hours/${hourKey}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(hourlyRef);
    const data = snap.exists ? (snap.data() as any) : {};
    const buckets: Record<string, number> = { ...(data?.buckets || {}) };
    const lastSeenTotal: number = typeof data?.lastSeenTotal === 'number' ? data.lastSeenTotal : currentTotalKWh;

    const delta = Math.max(0, Number((currentTotalKWh - lastSeenTotal).toFixed(6)));
    const bKey = `b${bucketIndex}`;
    const prevVal = typeof buckets[bKey] === 'number' ? buckets[bKey] : 0;
    const newVal = Number((prevVal + delta).toFixed(6));
    buckets[bKey] = newVal;

    tx.set(hourlyRef, {
      totalEnergyAtEnd: Number(currentTotalKWh.toFixed(6)),
      timezone: tz,
      isPartial: true,
      lastSeenTotal: Number(currentTotalKWh.toFixed(6)),
      lastSeenMinute: minute,
      buckets,
      updatedAt: new Date(),
    }, { merge: true });
  });
}

export const aggregateRealtimeBuckets = functions.pubsub
  .schedule('* * * * *') // every minute
  .timeZone('UTC')
  .onRun(async () => {
    // Iterate users
    const usersSnap = await db.collection('users').get();
    const tasks: Promise<void>[] = [];
    usersSnap.forEach(docSnap => {
      const uid = docSnap.id;
      tasks.push((async () => {
        try {
          const tz = await getUserTimezone(uid);
          const sensorIds = await getUserSensorIds(uid);
          if (sensorIds.length === 0) return; // no mapped sensors
          const total = await getCurrentTotalEnergyKWh(sensorIds);
          await upsertProvisionalHour(uid, tz, total);
        } catch (e) {
          console.error(`aggregateRealtimeBuckets for ${uid} failed`, e);
        }
      })());
    });
    await Promise.all(tasks);
  });
