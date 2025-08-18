import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { auth, firestore } from '../../../../services/firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type BugReportModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
};

const BUG_TYPES = ['App Crash', 'UI Issue', 'Performance', 'Data Issue', 'Other'] as const;

const BugReportModal: React.FC<BugReportModalProps> = ({ visible, onClose, onSubmitted }) => {
  const [bugType, setBugType] = useState<(typeof BUG_TYPES)[number]>('App Crash');
  const [otherType, setOtherType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const finalType = useMemo(() => (bugType === 'Other' ? (otherType.trim() || 'Other') : bugType), [bugType, otherType]);

  const reset = () => {
    setBugType('App Crash');
    setOtherType('');
    setDescription('');
  };

  const submit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing description', 'Please describe the issue so we can help.');
      return;
    }
    try {
      setSubmitting(true);
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('No authenticated user.');
      await addDoc(collection(firestore, 'BugReports', uid, 'reports'), {
        type: finalType,
        description: description.trim(),
        status: 'to be reviewed',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Submitted', 'Thanks! Your bug report has been sent.');
      reset();
      onClose();
      onSubmitted?.();
    } catch (e) {
      console.error('submit bug error', e);
      Alert.alert('Submit failed', 'Could not submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Report a Bug</Text>
          <Text style={styles.modalSubtitle}>Tell us what went wrong. We typically respond within 24–48 hours.</Text>

          <Text style={styles.modalLabel}>Type</Text>
          <View style={styles.selector}>
            {BUG_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.selectorChip, bugType === t && styles.selectorChipActive]}
                onPress={() => setBugType(t)}
              >
                <Text style={[styles.selectorChipText, bugType === t && styles.selectorChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {bugType === 'Other' ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.modalLabel}>Specify other</Text>
              <TextInput
                value={otherType}
                onChangeText={setOtherType}
                placeholder="Describe the type"
                style={styles.input}
              />
            </View>
          ) : null}

          <Text style={[styles.modalLabel, { marginTop: 8 }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What happened? Steps to reproduce, expected vs actual..."
            style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
            multiline
          />

          <View style={styles.modalActions}>
            <TouchableOpacity disabled={submitting} onPress={() => { reset(); onClose(); }} style={[styles.modalBtn, styles.modalBtnGhost]}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={submitting} onPress={submit} style={[styles.modalBtn, styles.modalBtnPrimary]}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalBtnPrimaryText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default BugReportModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalSubtitle: { color: '#6B7280', marginTop: 4 },
  modalLabel: { fontWeight: '700', color: '#111827', marginTop: 10 },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  selectorChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#F3F4F6' },
  selectorChipActive: { backgroundColor: '#DCFCE7' },
  selectorChipText: { color: '#374151', fontWeight: '700' },
  selectorChipTextActive: { color: '#166534' },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginTop: 6,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  modalBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  modalBtnGhost: { backgroundColor: '#F3F4F6' },
  modalBtnGhostText: { color: '#111827', fontWeight: '800' },
  modalBtnPrimary: { backgroundColor: '#5B934E' },
  modalBtnPrimaryText: { color: '#FFFFFF', fontWeight: '800' },
});
