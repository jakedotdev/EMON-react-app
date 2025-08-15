import React from 'react';
import { ScrollView, Text, View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { settingsStyles } from '../../settings/styles';

const PrivacyPolicyScreen: React.FC = () => {
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
            <TouchableOpacity onPress={() => Linking.openURL('https://emon.app/privacy')}>
              <Text style={stylesLegal.link}>View full Privacy Policy online →</Text>
            </TouchableOpacity>
            <Text style={[stylesLegal.muted, { marginTop: 8 }]}>Effective: Jan 1, 2024</Text>
          </View>
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
});
