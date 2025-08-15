import React from 'react';
import { ScrollView, Text, View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { settingsStyles } from '../../settings/styles';

const TermsOfServiceScreen: React.FC = () => {
  return (
    <ScrollView style={settingsStyles.container}>
     {/* Document Card */}
      <View style={settingsStyles.section}>
        <View style={stylesLegal.card}>
        <Text style={stylesLegal.title}>Terms of Service</Text>
        <Text style={stylesLegal.subtitle}>
          Please read these terms carefully before using EMON.
        </Text>
        <View style={stylesLegal.divider} />
          <Text style={stylesLegal.cardTitle}>Overview</Text>
          <Text style={stylesLegal.body}>
            By using EMON, you agree to these Terms of Service and our Privacy Policy.
          </Text>
          <Text style={stylesLegal.cardTitle}>Use of the Service</Text>
          <Bullet>Create and maintain one account per user</Bullet>
          <Bullet>Only connect energy sensors you own or have permission to use</Bullet>
          <Bullet>Do not attempt to disrupt or overload the service</Bullet>

          <Text style={stylesLegal.cardTitle}>Subscriptions & billing</Text>
          <Bullet>Some features may require a paid plan in the future</Bullet>
          <Bullet>We will always inform you before any charges apply</Bullet>

          <Text style={stylesLegal.cardTitle}>Acceptable use</Text>
          <Bullet>Follow applicable laws and regulations</Bullet>
          <Bullet>No reverse‑engineering or unauthorized access</Bullet>
          <Bullet>No sharing of another user’s data without consent</Bullet>

          <Text style={stylesLegal.cardTitle}>Intellectual property</Text>
          <Bullet>EMON and its content are protected by IP laws</Bullet>
          <Bullet>You retain ownership of your data</Bullet>

          <Text style={stylesLegal.cardTitle}>Disclaimers</Text>
          <Bullet>The app is provided “as is” without warranties</Bullet>
          <Bullet>We are not liable for indirect or consequential damages</Bullet>
          <Bullet>Service availability may vary</Bullet>

          <Text style={stylesLegal.cardTitle}>Termination</Text>
          <Bullet>We may suspend or terminate accounts for violations</Bullet>
          <Bullet>You may stop using EMON at any time</Bullet>

          <Text style={stylesLegal.cardTitle}>Contact</Text>
          <Bullet>support@emon.app</Bullet>

          <View style={stylesLegal.divider} />
          <View>
            <TouchableOpacity onPress={() => Linking.openURL('https://emon.app/terms')}>
              <Text style={stylesLegal.link}>View full Terms of Service online →</Text>
            </TouchableOpacity>
            <Text style={[stylesLegal.muted, { marginTop: 8 }]}>Effective: Jan 1, 2024</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default TermsOfServiceScreen;

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
