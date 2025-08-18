import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type AnalyticsDatePickerProps = {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
};

function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function endOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

function addMonthsUTC(d: Date, months: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
}

function sameUTCDate(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const AnalyticsDatePicker: React.FC<AnalyticsDatePickerProps> = ({ selectedDate, onSelect }) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonthUTC(selectedDate ?? today));

  const monthLabel = `${new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(viewMonth)}`;

  const daysGrid: Date[] = [];
  const start = startOfMonthUTC(viewMonth);
  const end = endOfMonthUTC(viewMonth);
  // Compute Monday-based week index for first day
  const firstWeekday = ((start.getUTCDay() || 7) - 1); // 0..6 where 0=Mon

  // Leading blanks from previous month
  for (let i = 0; i < firstWeekday; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() - (firstWeekday - i));
    daysGrid.push(d);
  }

  // Current month days
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    daysGrid.push(new Date(d));
  }

  // Trailing blanks to fill 6 rows max
  while (daysGrid.length % 7 !== 0) {
    const last = daysGrid[daysGrid.length - 1];
    const next = new Date(last);
    next.setUTCDate(last.getUTCDate() + 1);
    daysGrid.push(next);
  }

  const handlePrev = () => setViewMonth(addMonthsUTC(viewMonth, -1));
  const handleNext = () => setViewMonth(addMonthsUTC(viewMonth, 1));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrev} style={styles.navBtn}>
          <Text style={styles.navText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={handleNext} style={styles.navBtn}>
          <Text style={styles.navText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdaysRow}>
        {weekdayLabels.map((w) => (
          <Text key={w} style={styles.weekdayText}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {daysGrid.map((d, idx) => {
          const inCurrentMonth = d.getUTCMonth() === viewMonth.getUTCMonth();
          const isSelected = selectedDate ? sameUTCDate(d, selectedDate) : false;
          const isToday = sameUTCDate(d, today);
          return (
            <TouchableOpacity
              key={`${d.toISOString()}-${idx}`}
              style={[styles.dayCell, !inCurrentMonth && styles.dayCellOutside, isSelected && styles.dayCellSelected]}
              onPress={() => {
                onSelect(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
              }}
            >
              <View style={styles.dayInner}>
                <Text style={[styles.dayText, !inCurrentMonth && styles.dayTextOutside, isSelected && styles.dayTextSelected]}>
                  {d.getUTCDate()}
                </Text>
                {isToday && <View style={styles.dotToday} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const CELL_SIZE = 44;

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4F0',
  },
  navText: {
    color: '#5B934E',
    fontSize: 18,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 16,
    color: '#2F3E2F',
    fontWeight: '700',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  weekdayText: {
    width: CELL_SIZE,
    textAlign: 'center',
    color: '#7A8B7A',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 8,
  },
  dayInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellOutside: {
    opacity: 0.45,
  },
  dayCellSelected: {
    backgroundColor: '#E6F3E6',
    borderWidth: 1,
    borderColor: '#5B934E',
  },
  dayText: {
    color: '#2F3E2F',
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextOutside: {
    color: '#9AA99A',
  },
  dayTextSelected: {
    color: '#2F3E2F',
    fontWeight: '800',
  },
  dotToday: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5B934E',
    marginTop: 3,
  },
});

export default AnalyticsDatePicker;
