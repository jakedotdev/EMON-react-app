import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { HistoryData } from '../managers/AnalyticsDataManager';
import { SensorReadingModel } from '../../../models/SensorReading';

interface HistoryTableProps {
  historyData: HistoryData[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  sensors: { [key: string]: SensorReadingModel };
}

const HistoryTable: React.FC<HistoryTableProps> = ({
  historyData,
  selectedDate,
  onDateSelect,
  sensors,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const generateCalendarDays = () => {
    const today = new Date();
    const days = [];
    
    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const renderCalendar = () => {
    const days = generateCalendarDays();
    
    return (
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={() => setShowCalendar(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.calendarScroll}>
              <View style={styles.calendarGrid}>
                {days.map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      isToday(date) && styles.calendarDayToday,
                      isSelected(date) && styles.calendarDaySelected,
                    ]}
                    onPress={() => {
                      onDateSelect(date);
                      setShowCalendar(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isToday(date) && styles.calendarDayTextToday,
                        isSelected(date) && styles.calendarDayTextSelected,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    <Text
                      style={[
                        styles.calendarDayMonth,
                        isToday(date) && styles.calendarDayTextToday,
                        isSelected(date) && styles.calendarDayTextSelected,
                      ]}
                    >
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'Excellent':
        return '#4CAF50';
      case 'Good':
        return '#8BC34A';
      case 'Fair':
        return '#FFC107';
      case 'Poor':
        return '#F44336';
      default:
        return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Energy History</Text>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowCalendar(true)}
        >
          <Text style={styles.dateSelectorText}>
            {selectedDate ? formatDate(selectedDate) : 'Select Date'}
          </Text>
          <Text style={styles.dateSelectorIcon}>📅</Text>
        </TouchableOpacity>
      </View>

      {historyData.length > 0 ? (
        <ScrollView style={styles.tableContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Time</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Consumption</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Cost</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Efficiency</Text>
          </View>

          {historyData.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.time}</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.consumption}W</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>${item.cost.toFixed(3)}</Text>
              <View style={[styles.efficiencyCell, { flex: 1.2 }]}>
                <View
                  style={[
                    styles.efficiencyBadge,
                    { backgroundColor: getEfficiencyColor(item.efficiency) },
                  ]}
                >
                  <Text style={styles.efficiencyText}>{item.efficiency}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {selectedDate 
              ? 'No data available for selected date'
              : 'Select a date to view energy history'
            }
          </Text>
        </View>
      )}

      {renderCalendar()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B934E',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D3E6BF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateSelectorText: {
    color: '#467933',
    fontWeight: '600',
    marginRight: 8,
  },
  dateSelectorIcon: {
    fontSize: 16,
  },
  tableContainer: {
    maxHeight: 300,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  efficiencyCell: {
    alignItems: 'center',
  },
  efficiencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  efficiencyText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B934E',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  calendarScroll: {
    flex: 1,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDay: {
    width: '13%',
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarDayToday: {
    backgroundColor: '#D3E6BF',
  },
  calendarDaySelected: {
    backgroundColor: '#5B934E',
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarDayMonth: {
    fontSize: 10,
    color: '#666',
  },
  calendarDayTextToday: {
    color: '#467933',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
  },
});

export default HistoryTable;
