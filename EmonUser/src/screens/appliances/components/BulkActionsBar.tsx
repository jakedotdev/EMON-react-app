import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  isSelectionMode: boolean;
  selectedCount: number;
  totalFiltered: number;
  onToggleSelectionMode: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
}

const BulkActionsBar: React.FC<Props> = ({
  isSelectionMode,
  selectedCount,
  totalFiltered,
  onToggleSelectionMode,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
}) => (
  <View style={styles.container}>
    <TouchableOpacity style={styles.selectionButton} onPress={onToggleSelectionMode}>
      <Text style={styles.selectionButtonText}>{isSelectionMode ? 'Cancel' : 'Select'}</Text>
    </TouchableOpacity>

    {isSelectionMode && (
      <>
        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={selectedCount === totalFiltered ? onDeselectAll : onSelectAll}
        >
          <Text style={styles.selectAllButtonText}>
            {selectedCount === totalFiltered ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bulkDeleteButton, selectedCount === 0 && styles.bulkDeleteButtonDisabled]}
          onPress={onBulkDelete}
          disabled={selectedCount === 0}
        >
          <Text style={[styles.bulkDeleteButtonText, selectedCount === 0 && styles.bulkDeleteButtonTextDisabled]}>
            Delete ({selectedCount})
          </Text>
        </TouchableOpacity>
      </>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    marginTop: 0,
    gap: 8,
  },
  selectionButton: {
    paddingHorizontal: 16,

    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#5B934E',
  },
  selectionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#E8F5E8',
  },
  selectAllButtonText: { color: '#467933', fontSize: 14, fontWeight: '600' },
  bulkDeleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F44336',
  },
  bulkDeleteButtonDisabled: { backgroundColor: '#CCCCCC' },
  bulkDeleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  bulkDeleteButtonTextDisabled: { color: '#999999' },
});

export default BulkActionsBar;
