import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type WeeklyRangePickerProps = {
  onWeekSelect: (anyDateInWeek: Date) => void;
  initialDate?: Date | null;
};

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function startOfISOWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7; // 0..6 Mon..Sun
  date.setUTCDate(date.getUTCDate() - day);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfISOWeek(d: Date) {
  const start = startOfISOWeek(d);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return end;
}

const WeeklyRangePicker: React.FC<WeeklyRangePickerProps> = ({ onWeekSelect, initialDate }) => {
  const today = new Date();
  const [year] = useState<number>(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState<number>((initialDate ?? today).getMonth());
  const [fromDay, setFromDay] = useState<number>((initialDate ?? today).getDate());

  const daysInMonth = useMemo(() => new Date(year, monthIndex + 1, 0).getDate(), [year, monthIndex]);
  const fromDate = useMemo(() => new Date(Date.UTC(year, monthIndex, Math.min(fromDay, daysInMonth))), [year, monthIndex, fromDay, daysInMonth]);
  const snappedMonday = useMemo(() => startOfISOWeek(new Date(fromDate)), [fromDate]);
  const snappedSunday = useMemo(() => endOfISOWeek(new Date(fromDate)), [fromDate]);

  const apply = () => {
    // Auto-snap the selection to the ISO week of the From date
    const mondayLocal = new Date(snappedMonday.getUTCFullYear(), snappedMonday.getUTCMonth(), snappedMonday.getUTCDate());
    onWeekSelect(mondayLocal);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Week (auto-snap ISO Mon–Sun)</Text>

      <View style={styles.row}>
        {monthNames.map((m, idx) => (
          <TouchableOpacity key={m} style={[styles.month, idx===monthIndex && styles.monthSelected]} onPress={() => setMonthIndex(idx)}>
            <Text style={[styles.monthText, idx===monthIndex && styles.monthTextSelected]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.rowBetween}>
        <View style={styles.segment}>
          <Text style={styles.label}>From</Text>
          <View style={styles.daysWrap}>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <TouchableOpacity key={d} style={[styles.day, d===fromDay && styles.daySelected]} onPress={() => { setFromDay(d); }}>
                <Text style={[styles.dayText, d===fromDay && styles.dayTextSelected]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.segment}>
          <Text style={styles.label}>Snapped</Text>
          <Text style={styles.snapText}>{`${snappedMonday.getUTCMonth()+1}/${snappedMonday.getUTCDate()} - ${snappedSunday.getUTCMonth()+1}/${snappedSunday.getUTCDate()}`}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.applyBtn} onPress={apply}>
        <Text style={styles.applyText}>Apply Week</Text>
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
  title: {
    fontSize: 14,
    color: '#2F3E2F',
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  month: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F0F4F0',
    borderRadius: 8,
  },
  monthSelected: {
    backgroundColor: '#E6F3E6',
    borderWidth: 1,
    borderColor: '#5B934E',
  },
  monthText: {
    color: '#2F3E2F',
    fontSize: 12,
    fontWeight: '600',
  },
  monthTextSelected: {
    color: '#2F3E2F',
    fontWeight: '800',
  },
  segment: { flex: 1 },
  label: {
    color: '#5B934E',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  daysWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7F6',
  },
  daySelected: {
    backgroundColor: '#E6F3E6',
    borderWidth: 1,
    borderColor: '#5B934E',
  },
  dayText: { color: '#2F3E2F', fontSize: 12, fontWeight: '600' },
  dayTextSelected: { color: '#2F3E2F', fontWeight: '800' },
  snapText: { color: '#2F3E2F', fontSize: 13, fontWeight: '600' },
  applyBtn: {
    marginTop: 10,
    backgroundColor: '#5B934E',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  applyText: { color: '#FFFFFF', fontWeight: '700' },
});

export default WeeklyRangePicker;
