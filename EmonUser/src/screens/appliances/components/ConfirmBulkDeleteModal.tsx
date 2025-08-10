import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmBulkDeleteModal: React.FC<Props> = ({ visible, count, onCancel, onConfirm }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.title}>Unregister Multiple Appliances</Text>
        <Text style={styles.message}>Are you sure you want to unregister {count} appliance{count !== 1 ? 's' : ''}? This action cannot be undone.</Text>
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
            <Text style={styles.confirmText}>Unregister All</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  content: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, width: '85%' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  message: { color: '#555', marginBottom: 16 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelButton: { paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
  cancelText: { color: '#333' },
  confirmButton: { backgroundColor: '#E53935', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  confirmText: { color: '#FFF', fontWeight: 'bold' },
});

export default ConfirmBulkDeleteModal;
