import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type MonthPickerProps = {
  onMonthSelect: (firstDayOfMonth: Date) => void;
  initialDate?: Date | null;
  restrictToCurrentYear?: boolean;
};

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const MonthPicker: React.FC<MonthPickerProps> = ({ onMonthSelect, initialDate, restrictToCurrentYear = true }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState<number>(initialDate ? initialDate.getFullYear() : currentYear);
  const [monthIndex, setMonthIndex] = useState<number>((initialDate ?? now).getMonth());

  const canDecYear = useMemo(() => !restrictToCurrentYear || year > currentYear, [restrictToCurrentYear, year, currentYear]);
  const canIncYear = useMemo(() => !restrictToCurrentYear || year < currentYear, [restrictToCurrentYear, year, currentYear]);

  const apply = () => {
    const dt = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    onMonthSelect(dt);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity disabled={!canDecYear} onPress={() => canDecYear && setYear((y) => y - 1)} style={[styles.yearBtn, !canDecYear && styles.yearBtnDisabled]}>
          <Text style={styles.yearText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.yearLabel}>{year}</Text>
        <TouchableOpacity disabled={!canIncYear} onPress={() => canIncYear && setYear((y) => y + 1)} style={[styles.yearBtn, !canIncYear && styles.yearBtnDisabled]}>
          <Text style={styles.yearText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthGrid}>
        {monthNames.map((m, idx) => (
          <TouchableOpacity key={m} style={[styles.monthCell, idx===monthIndex && styles.monthCellSelected]} onPress={() => setMonthIndex(idx)}>
            <Text style={[styles.monthCellText, idx===monthIndex && styles.monthCellTextSelected]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.applyBtn} onPress={apply}>
        <Text style={styles.applyText}>Apply Month</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  yearBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4F0',
  },
  yearBtnDisabled: {
    opacity: 0.5,
  },
  yearText: {
    color: '#5B934E',
    fontSize: 18,
    fontWeight: '600',
  },
  yearLabel: {
    fontSize: 16,
    color: '#2F3E2F',
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  monthCell: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#F5F7F6',
  },
  monthCellSelected: {
    backgroundColor: '#E6F3E6',
    borderWidth: 1,
    borderColor: '#5B934E',
  },
  monthCellText: {
    color: '#2F3E2F',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  monthCellTextSelected: {
    color: '#2F3E2F',
    fontWeight: '800',
  },
  applyBtn: {
    marginTop: 10,
    backgroundColor: '#5B934E',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  applyText: { color: '#FFFFFF', fontWeight: '700' },
});

export default MonthPicker;
