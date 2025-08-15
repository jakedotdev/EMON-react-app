import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { auth, firestore } from '../../../../services/firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type RateUsModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
};

const RateUsModal: React.FC<RateUsModalProps> = ({ visible, onClose, onSubmitted }) => {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const submit = async () => {
    if (rating <= 0) {
      Alert.alert('Choose a rating', 'Please select how many stars to rate us.');
      return;
    }
    try {
      setSubmitting(true);
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('No authenticated user');

      await addDoc(collection(firestore, 'userFeedback', uid, 'feedback'), {
        rating,
        feedback: feedback.trim(),
        createdAt: serverTimestamp(),
        app: 'EMON User App',
      });

      Alert.alert('Thank you!', 'Your rating has been recorded.');
      setRating(0);
      setFeedback('');
      onClose();
      onSubmitted?.();
    } catch (e) {
      console.error('rate us submit error', e);
      Alert.alert('Submission failed', 'Could not submit your rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const Star: React.FC<{ index: number }> = ({ index }) => {
    const filled = index <= rating;
    return (
      <TouchableOpacity onPress={() => setRating(index)}>
        <Text style={[styles.star, filled ? styles.starFilled : styles.starEmpty]}>{filled ? '★' : '☆'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Rate us</Text>
          <Text style={styles.modalSubtitle}>How was your experience with the EMON team?</Text>

          <View style={styles.starsRow}>
            {[1,2,3,4,5].map((i) => (
              <Star key={i} index={i} />
            ))}
          </View>

          <Text style={styles.modalLabel}>Feedback (optional)</Text>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Tell us more about your rating..."
            style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
            multiline
          />

          <View style={styles.modalActions}>
            <TouchableOpacity disabled={submitting} onPress={onClose} style={[styles.modalBtn, styles.modalBtnGhost]}>
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

export default RateUsModal;

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
  modalLabel: { fontWeight: '700', color: '#111827', marginTop: 12 },
  starsRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 6 },
  star: { fontSize: 30 },
  starFilled: { color: '#F59E0B' },
  starEmpty: { color: '#D1D5DB' },
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
