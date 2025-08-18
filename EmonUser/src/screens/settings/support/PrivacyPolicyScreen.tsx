import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { settingsStyles } from '../../settings/styles';

const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = getAuth();
  const db = getFirestore();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const ref = doc(db, 'users', user.uid);
          const snap = await getDoc(ref);
          const v = !!snap.data()?.acceptedPrivacy;
          setAccepted(v);
        } catch {}
      } else {
        try {
          const v = await AsyncStorage.getItem('accepted_privacy');
          setAccepted(v === 'true');
        } catch {}
      }
    };
    load();
  }, []);

  const handleAccept = async () => {
    const user = auth.currentUser;
    setAccepted(true);
    if (user) {
      try { await updateDoc(doc(db, 'users', user.uid), { acceptedPrivacy: true, acceptedPrivacyAt: new Date() }); } catch {}
    } else {
      try { await AsyncStorage.setItem('accepted_privacy', 'true'); } catch {}
      try { navigation.navigate('SignUp'); } catch {}
    }
  };

  return (
    <ScrollView style={settingsStyles.container}>
      {/* Document Card */}
      <View style={settingsStyles.section}>
        <View style={stylesLegal.card}>
        <Text style={stylesLegal.title}>Privacy Policy</Text>
        <Text style={stylesLegal.subtitle}>
          We respect your privacy and are committed to protecting your personal data.
        </Text>
        <View style={stylesLegal.divider} />

          <Text style={stylesLegal.cardTitle}>Overview</Text>
          <Text style={stylesLegal.body}>
            This policy explains what data EMON collects, how we use it, and the rights you have over your
            information.
          </Text>

          <Text style={stylesLegal.cardTitle}>Data we collect</Text>
          <Bullet>Account info (email, display name, profile photo)</Bullet>
          <Bullet>Preferences (preferred timezone, units)</Bullet>
          <Bullet>Energy data (sensor readings, peak usage, historical analytics)</Bullet>
          <Bullet>Device info (app version, OS, device model) for diagnostics</Bullet>
          <Bullet>Crash and performance data to improve stability</Bullet>

          <Text style={stylesLegal.cardTitle}>How we use your data</Text>
          <Bullet>Provide core features: real‑time monitoring, analytics, history</Bullet>
          <Bullet>Compute insights (efficiency ratings, recommendations)</Bullet>
          <Bullet>Send alerts and notifications you opt into</Bullet>
          <Bullet>Improve performance, reliability, and user experience</Bullet>

          <Text style={stylesLegal.cardTitle}>Storage & retention</Text>
          <Bullet>Your data is stored securely in Firebase (Auth, Firestore, Realtime DB)</Bullet>
          <Bullet>We retain data as long as you maintain an account, or as required by law</Bullet>
          <Bullet>You can request deletion of your account and associated data</Bullet>

          <Text style={stylesLegal.cardTitle}>Sharing</Text>
          <Bullet>We do not sell your personal data</Bullet>
          <Bullet>We share data with service providers that help run EMON (e.g., Firebase)</Bullet>

          <Text style={stylesLegal.cardTitle}>Security</Text>
          <Bullet>We use industry‑standard safeguards and access controls</Bullet>
          <Bullet>You are responsible for protecting your account credentials</Bullet>

          <Text style={stylesLegal.cardTitle}>Your rights</Text>
          <Bullet>Access, update, export, or delete your data where applicable</Bullet>
          <Bullet>Opt out of non‑essential communications</Bullet>

          <Text style={stylesLegal.cardTitle}>Contact</Text>
          <Bullet>support@emon.app</Bullet>

          <View style={stylesLegal.divider} />
          <View>
            <Text style={[stylesLegal.muted, { marginTop: 8 }]}>Effective: Jan 1, 2024 - Present</Text>
          </View>

          {/* Acceptance checkbox */}
          <View style={[stylesLegal.divider, { marginTop: 16 }]} />
          <TouchableOpacity style={stylesLegal.acceptRow} onPress={handleAccept} activeOpacity={0.7}>
            <View style={[stylesLegal.checkboxBox, accepted && stylesLegal.checkboxBoxChecked]}>
              {accepted && <Text style={stylesLegal.checkboxMark}>✓</Text>}
            </View>
            <Text style={stylesLegal.body}>I have read and accept the Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default PrivacyPolicyScreen;

// ---- Local Components ----
const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={stylesLegal.bulletRow}>
    <Text style={stylesLegal.bulletDot}>•</Text>
    <Text style={stylesLegal.body}>{children}</Text>
  </View>
);

// ---- Local Styles ----
const stylesLegal = StyleSheet.create({
  heroCard: { alignItems: 'flex-start', backgroundColor: '#FFFFFF' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20, color: '#6B7280' },
  body: { color: '#374151', lineHeight: 20 },
  link: { color: '#2563EB', fontWeight: '600' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  bulletDot: { width: 18, color: '#6B7280' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 14,
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muted: { color: '#9CA3AF' },
  acceptRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxBoxChecked: { backgroundColor: '#5B934E', borderColor: '#5B934E' },
  checkboxMark: { color: '#fff', fontSize: 14, lineHeight: 14, fontWeight: '700' },
});
