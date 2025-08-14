import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { HistoryData } from '../managers/AnalyticsDataManager';
import { SensorReadingModel } from '../../../models/SensorReading';

interface HistoryTableProps {
  historyData: HistoryData[] | null | undefined;
  selectedDate: Date | null | undefined;
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

const HistoryTable: React.FC<HistoryTableProps> = ({ historyData, selectedDate }) => {
  const items = historyData ?? [];

  const formatTime12 = (t: string): string => {
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

  const head = (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.th, styles.timeCol]}>Time</Text>
      <Text style={[styles.th, styles.energyCol]}>Energy</Text>
      <Text style={[styles.th, styles.effCol]}>Efficiency</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {selectedDate ? `History • ${selectedDate.toDateString()}` : 'History'}
      </Text>

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
                <View key={`${item.date}_${item.time}_${idx}`}>
                  <View style={styles.row}>
                    <Text style={[styles.cell, styles.timeCol]}>{formatTime12(safeStringify(item.time))}</Text>
                    <Text style={[styles.cell, styles.energyCol, { color: getEnergyColor(item.consumption) }]}>{safeStringify(item.consumption)} Wh</Text>
                    <Text style={[styles.cell, styles.effCol, { color: getEfficiencyColor(item.efficiency) }]}>{safeStringify(item.efficiency)}</Text>
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
    fontSize: 16,
    fontWeight: '700',
    color: '#5B934E',
    marginBottom: 10,
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
    color: '#2F3E2F',
  },
  cell: {
    color: '#2F3E2F',
  },
  timeCol: {
    flex: 1,
    fontWeight: '600',
  },
  energyCol: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
  effCol: {
    width: 100,
    textAlign: 'right',
    fontWeight: '700',
  },
  sep: {
    height: 1,
    backgroundColor: '#EEF2EE',
  },
  scrollShell: {
    // exactly 6 rows visible (approx 44px row + 1px separator)
    maxHeight: 6 * 45,
  },
  scroll: {
    width: '100%',
  },
});

export default HistoryTable;
