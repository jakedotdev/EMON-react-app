import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { HistoryData, TimePeriod } from '../managers/AnalyticsDataManager';
import { SensorReadingModel } from '../../../models/SensorReading';

interface HistoryTableProps {
  historyData: HistoryData[] | null | undefined;
  selectedDate: Date | null | undefined;
  selectedPeriod: TimePeriod;
  onDateSelect?: (d: Date) => void;
  sensors: { [key: string]: SensorReadingModel };
}

const safeStringify = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'boolean') return v.toString();
  return '';
};

const COLORS = {
  success: '#2E7D32',
  positive: '#1B5E20',
  warning: '#EF6C00',
  error: '#C62828',
  muted: '#6B6B6B',
} as const;

const HistoryTable: React.FC<HistoryTableProps> = ({ historyData, selectedDate, selectedPeriod }) => {
  const items = historyData ?? [];

  const formatTime12 = (t: string): string => {
    // If already formatted with AM/PM, return as-is to avoid duplicates
    const up = (t || '').toUpperCase();
    if (up.includes(' AM') || up.includes(' PM')) return t;
    // Expecting HH:MM
    const parts = t.split(':');
    if (parts.length < 2) return t;
    const hNum = parseInt(parts[0], 10);
    const m = parts[1];
    if (Number.isNaN(hNum)) return t;
    const ampm = hNum >= 12 ? 'PM' : 'AM';
    let h12 = hNum % 12; if (h12 === 0) h12 = 12;
    const hStr = h12.toString().padStart(2, '0');
    return `${hStr}:${m} ${ampm}`;
  };

  const getEfficiencyColor = (eff?: string): string => {
    switch ((eff || '').toLowerCase()) {
      case 'excellent':
        return COLORS.positive;
      case 'good':
        return COLORS.success;
      case 'average':
        return COLORS.warning;
      case 'poor':
        return COLORS.error;
      default:
        return COLORS.muted;
    }
  };

  const getEnergyColor = (wh?: number): string => {
    const v = typeof wh === 'number' ? wh : 0;
    if (v === 0) return COLORS.muted;
    if (v <= 150) return COLORS.success;
    if (v <= 400) return COLORS.warning;
    return COLORS.error;
  };

  // Compute simple average across items to derive relative level coding
  const avgConsumption = items.length
    ? items.reduce((s, it) => s + (typeof it.consumption === 'number' ? it.consumption : 0), 0) / items.length
    : 0;

  const getLevelAndColor = (wh?: number): { label: string; color: string } => {
    const v = typeof wh === 'number' ? wh : 0;
    if (avgConsumption <= 0) return { label: '', color: COLORS.muted };
    const ratio = v / avgConsumption;
    if (ratio >= 1.3) return { label: 'High', color: '#F44336' };
    if (ratio >= 1.1) return { label: 'Above avg', color: '#FF9800' };
    if (ratio >= 0.9) return { label: 'Normal', color: '#5B934E' };
    if (ratio >= 0.7) return { label: 'Low', color: '#4CAF50' };
    return { label: 'Very low', color: '#2E7D32' };
  };

  const getLevelPillColors = (label: string): { bg: string; text: string } => {
    switch (label) {
      case 'High':
        return { bg: '#FDECEA', text: '#C62828' }; // light red
      case 'Above avg':
        return { bg: '#FFF4E5', text: '#EF6C00' }; // light orange
      case 'Normal':
        return { bg: '#ECF6EC', text: '#2E7D32' }; // light green
      case 'Low':
        return { bg: '#EAF7EA', text: '#2E7D32' };
      case 'Very low':
        return { bg: '#E6F5E6', text: '#1B5E20' };
      default:
        return { bg: '#F2F2F2', text: '#6B6B6B' };
    }
  };

  const head = (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.th, styles.timeCol]}>Time</Text>
      <Text style={[styles.th, styles.energyCol]}>Energy</Text>
      <Text style={[styles.th, styles.levelCol]}>Level</Text>
    </View>
  );

  // Header subtitle by period
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (d: Date) => `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const fmtMonth = (d: Date) => `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  const fmtHour = (d: Date) => {
    let h = d.getHours();
    const m = '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12}:${m} ${ampm}`;
  };
  const getISOWeekRange = (ref: Date) => {
    // Monday..Sunday range for the week containing ref
    const dateUTC = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
    const dayOfWeek = (dateUTC.getUTCDay() || 7);
    const monday = new Date(dateUTC);
    monday.setUTCDate(dateUTC.getUTCDate() - ((dayOfWeek === 7 ? 0 : dayOfWeek) - 1));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return { start: new Date(monday.getTime()), end: new Date(sunday.getTime()) };
  };
  const headerSubtitle = () => {
    const now = new Date();
    const ref = selectedDate ?? now;
    switch (selectedPeriod) {
      case 'Realtime': {
        return `${fmtDate(now)} • ${fmtHour(now)}`;
      }
      case 'Daily': {
        return fmtDate(ref);
      }
      case 'Weekly': {
        const { start, end } = getISOWeekRange(ref);
        return `${monthNames[start.getMonth()]} ${start.getDate()}–${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
      }
      case 'Monthly': {
        return fmtMonth(ref);
      }
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>History</Text>
      <Text style={styles.subheader}>{headerSubtitle()}</Text>

      {items.length === 0 ? (
        <Text style={styles.empty}>No history for this date.</Text>
      ) : (
        <View style={styles.table}>
          {head}
          <View style={styles.sep} />
          <View style={styles.scrollShell}>
            <ScrollView
              style={styles.scroll}
              nestedScrollEnabled={Platform.OS === 'android'}
              showsVerticalScrollIndicator={true}
            >
              {items.map((item, idx) => (
                <View key={`${safeStringify(item.date)}-${idx}`}>
                  <View style={[styles.row, idx % 2 === 1 && styles.altRow]}>
                    <Text style={[styles.cell, styles.timeCol]}>{formatTime12(safeStringify(item.time))}</Text>
                    <Text style={[styles.cell, styles.energyCol]}>
                      <Text style={[styles.energyValue, { color: getEnergyColor(item.consumption) }]}>{safeStringify(item.consumption)}</Text>
                      <Text style={styles.unit}> Wh</Text>
                    </Text>
                    {(() => { const lv = getLevelAndColor(item.consumption); const c = getLevelPillColors(lv.label); return (
                      <View style={[styles.levelCol, styles.levelPill, { backgroundColor: c.bg }]}>
                        <Text style={[styles.levelPillText, { color: c.text }]}>{lv.label}</Text>
                      </View>
                    ); })()}
                  </View>
                  {idx < items.length - 1 && <View style={styles.sep} />}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 3,
  },
  header: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5B934E',
    marginBottom: 10,
  },
  subheader: {
    marginTop: -6,
    marginBottom: 8,
    color: '#6B6B6B',
    fontSize: 12,
  },
  empty: {
    color: '#6B6B6B',
    fontSize: 13,
  },
  table: {
    borderWidth: 1,
    borderColor: '#E6EDE6',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  headerRow: {
    backgroundColor: '#F4F8F4',
  },
  th: {
    fontWeight: '700',
    color: '#3A4A3A',
    fontSize: 12,
  },
  cell: {
    color: '#3A4A3A',
    fontSize: 12,
  },
  timeCol: {
    flex: 1,
    fontWeight: '600',
  },
  energyCol: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
  energyValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  unit: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  levelCol: {
    textAlign: 'center',
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelPill: {
    paddingHorizontal: 0,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  levelPillText: {
    fontWeight: '700',
    fontSize: 10,
  },
  altRow: {
    backgroundColor: '#FCFCFC',
  },
  sep: {
    height: 1,
    backgroundColor: '#F1F3F1',
  },
  scrollShell: {
    // ~6 rows visible
    maxHeight: 6 * 40,
  },
  scroll: {
    width: '100%',
  },
});

export default HistoryTable;
