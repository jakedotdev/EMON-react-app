// Common IANA timezones used by the app. Extend as needed.
export const TIMEZONES: string[] = [
  'UTC',
  // Americas
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix',
  'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo', 'America/Mexico_City',
  // Europe
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam',
  'Europe/Brussels', 'Europe/Zurich', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Athens', 'Europe/Helsinki',
  // Africa
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  // Middle East
  'Asia/Dubai', 'Asia/Riyadh', 'Asia/Jerusalem',
  // Asia
  'Asia/Kolkata', 'Asia/Karachi', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Kuala_Lumpur',
  'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Seoul', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Manila', 'Asia/Ho_Chi_Minh',
  // Oceania
  'Australia/Perth', 'Australia/Adelaide', 'Australia/Sydney', 'Pacific/Auckland'
];

export function filterTimezones(query: string): string[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return TIMEZONES;
  return TIMEZONES.filter(z => z.toLowerCase().includes(q));
}
