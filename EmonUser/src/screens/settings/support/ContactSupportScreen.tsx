import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, Linking, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { settingsStyles } from '../../settings/styles';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../../../services/firebase/firebaseConfig';
import SupportQuickActions from './components/SupportQuickActions';
import RateUsModal from './components/RateUsModal';

const ContactSupportScreen: React.FC = () => {
  const [bugModalVisible, setBugModalVisible] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [bugType, setBugType] = useState<string>('UI issue');
  const [otherType, setOtherType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const bugTypes = ['UI issue', 'Crash', 'Performance', 'Incorrect data', 'Notification issue', 'Connectivity', 'Other'];

  const navigation = useNavigation<any>();

  const submitBugReport = async () => {
    try {
      setSubmitting(true);
      const user = auth.currentUser;
      const uid = user?.uid;
      if (!uid) {
        Alert.alert('Sign in required', 'Please sign in to submit a bug report.');
        setSubmitting(false);
        return;
      }

      const chosenType = bugType === 'Other' && otherType.trim() ? otherType.trim() : bugType;
      if (!description.trim()) {
        Alert.alert('Missing description', 'Please provide a brief description of the issue.');
        setSubmitting(false);
        return;
      }

      await addDoc(collection(firestore, 'BugReports', uid, 'reports'), {
        type: chosenType,
        baseType: bugType,
        description: description.trim(),
        status: 'to be reviewed',
        createdAt: serverTimestamp(),
        app: 'EMON User App',
      });

      setBugModalVisible(false);
      setBugType('UI issue');
      setOtherType('');
      setDescription('');
      Alert.alert('Submitted', 'Thanks! Your bug report has been submitted.');
    } catch (e) {
      console.error('Bug report submit error', e);
      Alert.alert('Submission failed', 'Failed to submit bug report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <ScrollView style={settingsStyles.container}>
      {/* Hero */}
      <View style={[settingsStyles.section, stylesSupport.heroCard]}>
        <Text style={stylesSupport.title}>Contact Support</Text>
        <Text style={stylesSupport.subtitle}>
          We're here to help. Reach us through any of the channels below.
        </Text>
      </View>

      {/* Details */}
      <View style={settingsStyles.section}>
              <Text style={settingsStyles.sectionTitle}>Support details</Text>
              <Row icon="✉️" label="Email" value="support@emon.app" />
              <Row icon="📞" label="Phone" value="+63 993 3726 809" />
              <Row icon="⏱️" label="Response time" value="Within 24–48 hours" />
              <Row icon="🗓️" label="Support hours" value="Mon–Fri, 9am–6pm" />
      </View>


      {/* Quick Actions */}
      <SupportQuickActions
        onEmailSupport={() => Linking.openURL('mailto:support@emon.app')}
        onMyReports={() => navigation.navigate('MyReports')}
        onReportBug={() => setBugModalVisible(true)}
        onRateUs={() => setRateModalVisible(true)}
      />

      {/* Tips */}
      <View style={settingsStyles.section}>
        <Text style={settingsStyles.sectionTitle}>Tips to get faster help</Text>
        <View style={stylesSupport.tipItem}><Text style={stylesSupport.tipBullet}>•</Text><Text style={stylesSupport.tipText}>Describe what you were trying to do</Text></View>
        <View style={stylesSupport.tipItem}><Text style={stylesSupport.tipBullet}>•</Text><Text style={stylesSupport.tipText}>Include screenshots if possible</Text></View>
        <View style={stylesSupport.tipItem}><Text style={stylesSupport.tipBullet}>•</Text><Text style={stylesSupport.tipText}>Share the exact error message</Text></View>
        <View style={stylesSupport.tipItem}><Text style={stylesSupport.tipBullet}>•</Text><Text style={stylesSupport.tipText}>Tell us your device and app version</Text></View>
      </View>
    </ScrollView>

    {/* Rate Us Modal */}
    <RateUsModal
      visible={rateModalVisible}
      onClose={() => setRateModalVisible(false)}
    />
    <Modal visible={bugModalVisible} animationType="slide" transparent onRequestClose={() => setBugModalVisible(false)}>
      <View style={stylesSupport.modalOverlay}>
        <View style={stylesSupport.modalCard}>
          <Text style={stylesSupport.modalTitle}>Report a Bug</Text>
          <Text style={stylesSupport.modalSubtitle}>Tell us what went wrong. We typically respond within 24–48 hours.</Text>

          {/* Type Selector */}
          <Text style={stylesSupport.modalLabel}>Type</Text>
          <View style={stylesSupport.selector}>
            {bugTypes.map((t) => (
              <TouchableOpacity
                key={t}
                style={[stylesSupport.selectorChip, bugType === t && stylesSupport.selectorChipActive]}
                onPress={() => setBugType(t)}
              >
                <Text style={[stylesSupport.selectorChipText, bugType === t && stylesSupport.selectorChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {bugType === 'Other' ? (
            <View style={{ marginTop: 8 }}>
              <Text style={stylesSupport.modalLabel}>Specify other</Text>
              <TextInput
                value={otherType}
                onChangeText={setOtherType}
                placeholder="Describe the type"
                style={stylesSupport.input}
              />
            </View>
          ) : null}

          {/* Description */}
          <Text style={[stylesSupport.modalLabel, { marginTop: 8 }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What happened? Steps to reproduce, expected vs actual..."
            style={[stylesSupport.input, { height: 110, textAlignVertical: 'top' }]}
            multiline
          />

          {/* Actions */}
          <View style={stylesSupport.modalActions}>
            <TouchableOpacity disabled={submitting} onPress={() => setBugModalVisible(false)} style={[stylesSupport.modalBtn, stylesSupport.modalBtnGhost]}>
              <Text style={stylesSupport.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={submitting} onPress={submitBugReport} style={[stylesSupport.modalBtn, stylesSupport.modalBtnPrimary]}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={stylesSupport.modalBtnPrimaryText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};

export default ContactSupportScreen;

// ---- Local Components ----
const Row: React.FC<{ icon?: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={stylesSupport.row}>
    {icon ? <Text style={stylesSupport.rowIcon}>{icon}</Text> : null}
    <Text style={stylesSupport.rowLabel} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
    <Text style={stylesSupport.rowValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
  </View>
);

const ActionButton: React.FC<{ icon: string; label: string; onPress: () => void; color: string; bg: string }> = ({
  icon,
  label,
  onPress,
  color,
  bg,
}) => (
  <TouchableOpacity onPress={onPress} style={[stylesSupport.actionBtn, { backgroundColor: bg }]}> 
    <Text style={[stylesSupport.actionIcon, { color }]}>{icon}</Text>
    <Text style={[stylesSupport.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ---- Local Styles ----
const stylesSupport = StyleSheet.create({
  heroCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
  },
  rowIcon: { fontSize: 16, marginRight: 8 },
  rowLabel: { color: '#6B7280', flex: 1, marginRight: 8 },
  rowValue: { color: '#111827', fontWeight: '600', textAlign: 'right' },

  actionsCard: {},
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { fontSize: 18, marginBottom: 6, fontWeight: '600' },
  actionLabel: { fontSize: 14, fontWeight: '700' },

  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  tipBullet: { width: 18, color: '#6B7280' },
  tipText: { flex: 1, color: '#374151', lineHeight: 20 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalSubtitle: { marginTop: 4, color: '#6B7280', lineHeight: 20 },
  modalLabel: { marginTop: 12, color: '#111827', fontWeight: '700' },
  input: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  selectorChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  selectorChipActive: { backgroundColor: '#E3F2FD', borderColor: '#1976D2' },
  selectorChipText: { color: '#374151' },
  selectorChipTextActive: { color: '#0B61D6', fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  modalBtn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
  modalBtnGhost: { backgroundColor: '#F3F4F6' },
  modalBtnGhostText: { color: '#111827', fontWeight: '700' },
  modalBtnPrimary: { backgroundColor: '#1976D2' },
  modalBtnPrimaryText: { color: '#FFFFFF', fontWeight: '800' },

  // Reports list styles
  reportItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
  },
  reportType: { fontWeight: '800', color: '#111827' },
  reportStatus: { color: '#2563EB', fontWeight: '700' },
  reportDesc: { marginTop: 6, color: '#374151', lineHeight: 20 },
  reportMeta: { color: '#6B7280', fontSize: 12 },
  responseBox: {
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
  },
  responseLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  responseText: { color: '#111827' },
});
