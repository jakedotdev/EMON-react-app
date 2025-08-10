import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  groups: string[];
  selected: string;
  onSelect: (group: string) => void;
}

const GroupChips: React.FC<Props> = ({ groups, selected, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.scroll}
    contentContainerStyle={styles.chipsContainer}
  >
    {['All', ...groups].map(group => {
      const isSelected = selected === group;
      return (
        <TouchableOpacity
          key={group}
          style={[styles.chip, isSelected && styles.chipSelected]}
          onPress={() => onSelect(group)}
        >
          <Text
            style={[styles.chipText, isSelected && styles.chipTextSelected]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {group}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  scroll: {
    paddingVertical: 0,
    paddingTop: 4,
    paddingBottom: 0,
    marginVertical: 0,
    marginBottom: 8,
    height: 28,
    flexGrow: 0,
  },
  chipsContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
    marginBottom: 0,
    gap: 2,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 12,
    paddingVertical: 0,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  chipSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#5B934E',
  },
  chipText: {
    color: '#555555',
    fontSize: 12,
    lineHeight: 14,
    includeFontPadding: false,
  },
  chipTextSelected: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
});

export default GroupChips;
