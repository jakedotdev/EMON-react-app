import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, FlatList } from 'react-native';
import { TIMEZONES, filterTimezones } from '../utils/timezones';

interface Props {
  value: string;
  onChange: (tz: string) => void;
}

const TimezonePicker: React.FC<Props> = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const data = useMemo(() => filterTimezones(query), [query]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Preferred Timezone</Text>
      <TouchableOpacity style={[styles.input, styles.dropdown]} onPress={() => setVisible(true)} activeOpacity={0.8}>
        <Text style={styles.dropdownText}>{value}</Text>
      </TouchableOpacity>
      <View style={styles.inlineActions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            const now = new Date();
            // 1) Try Intl resolvedOptions
            try {
              const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
              if (tz) {
                onChange(tz);
                return;
              }
            } catch {}

            // 2) Fallback: match device current offset to a known timezone in TIMEZONES
            try {
              const deviceOffsetMin = -now.getTimezoneOffset(); // e.g., +480 for UTC+8
              const findOffsetForTz = (tz: string): number => {
                const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
                // offset minutes between tz local and UTC now
                return Math.round((local.getTime() - now.getTime()) / 60000);
              };
              const candidate = TIMEZONES.find(tz => {
                try {
                  return findOffsetForTz(tz) === deviceOffsetMin;
                } catch {
                  return false;
                }
              });
              onChange(candidate || 'UTC');
            } catch {
              onChange('UTC');
            }
          }}
        >
          <Text style={styles.secondaryButtonText}>Use device timezone</Text>
        </TouchableOpacity>
        <Text style={styles.helperText}>Used for accurate daily/weekly/monthly analytics.</Text>
      </View>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Select Timezone</Text>
              <TextInput
                style={modalStyles.search}
                placeholder="Search timezones"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={data}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[modalStyles.item, item === value && modalStyles.itemSelected]}
                  onPress={() => {
                    onChange(item);
                    setVisible(false);
                  }}
                >
                  <Text style={modalStyles.itemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={modalStyles.closeButton} onPress={() => setVisible(false)}>
              <Text style={modalStyles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  inlineActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  secondaryButton: {
    backgroundColor: '#F0F3F7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    color: '#6b7280',
    fontSize: 12,
  },
  dropdown: {
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  search: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  itemSelected: {
    backgroundColor: '#f0f7ff',
  },
  itemText: {
    fontSize: 16,
    color: '#111827',
  },
  closeButton: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    padding: 14,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TimezonePicker;
