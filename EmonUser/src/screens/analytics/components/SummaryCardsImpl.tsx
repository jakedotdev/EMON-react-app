import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TimePeriod } from '../managers/AnalyticsDataManager';
import { SummaryCardData } from '../../../services/analytics/EnergyCalculationService';
import { AnalyticsCalculator } from '../utils/AnalyticsCalculator';

interface SummaryCardsProps {
  summaryCardData: SummaryCardData;
  selectedPeriod: TimePeriod;
}

const safeStringify = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  return '';
};

const SummaryCards: React.FC<SummaryCardsProps> = ({ summaryCardData, selectedPeriod }) => {
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const normalizeUnits = (s: string): string =>
    s
      .replace(/\sWh\b/g, '\u00A0Wh')
      .replace(/\skWh\b/g, '\u00A0kWh')
      .replace(/\skW\b/g, '\u00A0kW');

  const formatValue = (num: unknown): string => {
    // Prefer centralized formatting; fall back safely
    try {
      if (typeof num === 'number') {
        return normalizeUnits(AnalyticsCalculator.formatConsumptionValue(num, selectedPeriod));
      }
    } catch (e) {
      // ignore and fall back
    }
    return normalizeUnits(safeStringify(num));
  };

  const items = [
    { key: 'total', icon: 'Σ', label: safeStringify(summaryCardData.totalLabel), value: formatValue(summaryCardData.totalValue), color: '#4CAF50' },
    { key: 'avg', icon: 'Ø', label: safeStringify(summaryCardData.avgLabel), value: formatValue(summaryCardData.avgValue), color: '#2196F3' },
    { key: 'peak', icon: '⚡', label: safeStringify(summaryCardData.peakLabel), value: formatValue(summaryCardData.peakValue), detail: summaryCardData.peakDetail ? safeStringify(summaryCardData.peakDetail) : '', color: '#FF9800' },
  ];

  const analysisFor = (key: string): string => {
    try {
      switch (key) {
        case 'total': {
          const totalStr = AnalyticsCalculator.formatConsumptionValue(Number(summaryCardData.totalValue || 0), selectedPeriod);
          if (selectedPeriod === 'Realtime') {
            return `Current is ${totalStr} representing the instantaneous delta since the last sensor reading (current total − previous total).`;
          }
          if (selectedPeriod === 'Daily') {
            return `Daily total is ${totalStr} from summing 24 hourly deltas; falls back to differences of totalEnergyAtEnd when a delta is missing.`;
          }
          if (selectedPeriod === 'Weekly') {
            return `Weekly total is ${totalStr} from adding each day’s total across the ISO week (Mon–Sun).`;
          }
          // Monthly
          return `Monthly total is ${totalStr} from adding each day’s total across the month.`;
        }
        case 'avg': {
          const avgStr = AnalyticsCalculator.formatConsumptionValue(Number(summaryCardData.avgValue || 0), selectedPeriod);
          if (selectedPeriod === 'Realtime') {
            return `Avg so far today is ${avgStr} computed as (sum of hourly deltas from 00:00 to current hour ÷ hours passed).`;
          }
          if (selectedPeriod === 'Daily') {
            return `Avg hourly is ${avgStr} computed as (daily total ÷ 24).`;
          }
          if (selectedPeriod === 'Weekly') {
            return `Avg daily is ${avgStr} computed as (weekly total ÷ 7).`;
          }
          // Monthly
          return `Avg weekly is ${avgStr} computed as (monthly total ÷ number of ISO weeks overlapping the month).`;
        }
        case 'peak': {
          const peakStr = AnalyticsCalculator.formatConsumptionValue(Number(summaryCardData.peakValue || 0), selectedPeriod);
          const detail = summaryCardData.peakDetail ? ` ${summaryCardData.peakDetail}` : '';
          if (selectedPeriod === 'Realtime') {
            return `Peak is ${peakStr}${detail}, identified as the highest instantaneous delta observed today.`;
          }
          if (selectedPeriod === 'Daily') {
            return `Peak hour is ${peakStr}${detail}, identified as the largest hourly delta for the day.`;
          }
          if (selectedPeriod === 'Weekly') {
            return `Peak day is ${peakStr}${detail}, identified as the largest daily total within the week.`;
          }
          // Monthly
          return `Peak week is ${peakStr}${detail}, identified as the ISO week with the largest sum in the month.`;
        }
        default:
          return '';
      }
    } catch {
      return '';
    }
  };

  const combinedAnalysis = () => {
    const parts = ['total', 'avg', 'peak'].map((k) => analysisFor(k));
    return parts.filter(Boolean).join('\n');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Summary</Text>
        <Text style={styles.periodPill}>{selectedPeriod}</Text>
      </View>
      <View style={styles.cardsRow}>
        {items.map((it) => (
          <View key={it.key} style={styles.card}>
            <View style={styles.topRow}>
              <View style={[styles.iconWrap, { backgroundColor: it.color + '20' }]}> 
                <Text style={[styles.icon, { color: it.color }]}>{it.icon}</Text>
              </View>
            </View>
            <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{it.value}</Text>
            <Text style={styles.label} numberOfLines={1}>{it.label}</Text>
            {it.key === 'peak' && !!it.detail && (
              <Text style={styles.detail} numberOfLines={1}>
                {it.detail}
              </Text>
            )}
          </View>
        ))}
      </View>
      <View style={styles.divider} />
      <TouchableOpacity onPress={() => setShowAnalysis((s) => !s)}>
        <Text style={styles.viewAnalysis}>{showAnalysis ? 'Hide summary analysis' : 'View summary analysis'}</Text>
      </TouchableOpacity>
      {showAnalysis && (
        <View style={styles.analysisContainer}>
          {combinedAnalysis()
            .split('\n')
            .filter(Boolean)
            .map((line, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bullet}>{'•'}</Text>
                <Text style={styles.analysisText}>{line}</Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  header: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5B934E',
  },
  periodPill: {
    fontSize: 12,
    color: '#2F3E2F',
    backgroundColor: '#EEF7EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#F7FAF7',
    borderWidth: 1,
    borderColor: '#E0E8E0',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  icon: {
    fontSize: 14,
    fontWeight: '900',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2F3E2F',
    marginBottom: 2,
    width: '100%',
  },
  label: {
    fontSize: 12,
    color: '#667066',
    flexShrink: 1,
  },
  detail: {
    fontSize: 12,
    color: '#556055',
    width: '100%',
  },
  viewAnalysis: {
    marginTop: 8,
    fontSize: 12,
    color: '#5B934E',
    fontWeight: '600',
  },
  analysisText: {
    fontSize: 12,
    color: '#2F3E2F',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EFE8',
    marginTop: 10,
    marginBottom: 8,
  },
  analysisContainer: {
    backgroundColor: '#F9FEF9',
    borderWidth: 1,
    borderColor: '#E0E8E0',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bullet: {
    color: '#5B934E',
    fontSize: 14,
    lineHeight: 18,
  },
});

export default SummaryCards;
