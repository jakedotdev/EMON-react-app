# EMON Cloud Functions: Realtime Bucket Aggregation

This Cloud Function aggregates realtime energy consumption into 10‑minute buckets for the current hour and writes them to Firestore at:

```
users/{uid}/historical/root/hourly/{YYYY-MM-DD}/hours/{HH}
```

It mirrors the app logic in `HistoricalDataStoreService.upsertProvisionalHour()` so the Analytics Realtime chart can read `{ b1..b6 }` for the current hour.

## What it does

- Runs every minute via Cloud Scheduler / PubSub.
- Iterates all documents in `users/`.
- Resolves each user's timezone from `users/{uid}.timezone` (defaults to `UTC`).
- Reads mapped sensor IDs from `users/{uid}/devices/*` → `sensorId` fields.
- Sums current kWh from RTDB keys `SensorReadings` or `SensorReadings_*` (filtered by mapped sensors).
- Calculates the active 10‑minute bucket (1..6) in the user's local hour and adds the delta since the last write to:
  - `buckets.b{1..6}`
  - Also updates `lastSeenTotal`, `totalEnergyAtEnd`, `timezone`, `isPartial`, `updatedAt`.

## Prerequisites

- Firebase project with Firestore and Realtime Database enabled.
- Billing enabled (Cloud Scheduler requires Blaze plan).
- `users/{uid}` documents exist and optionally have a `timezone` field.
- `users/{uid}/devices/*` documents that include a `sensorId` matching your RTDB sensor keys (e.g., `SensorReadings_1`).

## Install & Deploy

From the repository root (where `firebase.json` resides):

```bash
# Install Firebase CLI if not installed
npm i -g firebase-tools

# Login and select your project
firebase login
firebase use <your-project-id>

# Install function dependencies
cd functions
npm install
npm run build
cd ..

# Deploy only functions
firebase deploy --only functions
```

> Note: The schedule is defined in code as `* * * * *` (every minute) in `src/index.ts`.

## Local development (optional)

You can use the emulator for functions, but RTDB/Firestore reads should point at your project if you want realistic data. For pure logic testing:

```bash
cd functions
npm run build
firebase emulators:start --only functions
```

## Configuration/Structure assumptions

- `users/{uid}.timezone`: string like `Asia/Manila`. If absent, defaults to `UTC`.
- `users/{uid}/devices/*`: contains `sensorId` field. Only these sensors are counted.
- RTDB root contains sensor nodes under `SensorReadings` or `SensorReadings_*` with a numeric `energy` (kWh).

## Files

- `src/index.ts` – main function `aggregateRealtimeBuckets`.
- `package.json`, `tsconfig.json` – TypeScript and functions configuration.

## Security

- Uses Admin SDK with full access in Cloud Functions.
- Firestore/RTDB security rules do not restrict Admin access.

## Troubleshooting

- Ensure billing is enabled for Cloud Scheduler to run scheduled functions.
- If no data appears in `buckets`, verify:
  - `users/{uid}/devices` exist and have `sensorId` values matching RTDB keys.
  - RTDB sensor nodes have `energy` numeric values.
  - The project selected in `firebase use` is the one the mobile app is using.
