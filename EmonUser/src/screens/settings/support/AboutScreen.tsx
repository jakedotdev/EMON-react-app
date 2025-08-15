import React, { useState } from 'react';
import { ScrollView, Text, View, Linking, StyleSheet, TouchableOpacity } from 'react-native';
import type { StyleProp, ViewStyle, TextStyle } from 'react-native';
import { settingsStyles } from '../../settings/styles';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { SettingsStackParamList } from '../../../navigation/SettingsStackNavigator';

const AboutScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<SettingsStackParamList>>();
  const year = new Date().getFullYear();
  return (
    <ScrollView style={settingsStyles.container}>
      {/* Hero Card */}
      <View style={[settingsStyles.section, stylesAbout.heroCard]}>
        <Text style={stylesAbout.appName}>EMON</Text>
        <Text style={stylesAbout.subtitle}>Energy Monitoring, Simplified</Text>
        <View style={stylesAbout.badgesRow}>
          <View style={[stylesAbout.badge, { backgroundColor: '#E3F2FD' }]}>
            <Text style={[stylesAbout.badgeText, { color: '#1976D2' }]}>v1.0.0</Text>
          </View>
          <View style={[stylesAbout.badge, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[stylesAbout.badgeText, { color: '#2E7D32' }]}>Stable</Text>
          </View>
          <View style={[stylesAbout.badge, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[stylesAbout.badgeText, { color: '#EF6C00' }]}>Realtime</Text>
          </View>
        </View>
      </View>

      {/* Overview */}
      <View style={settingsStyles.section}>
        <Text style={settingsStyles.sectionTitle}>About EMON</Text>
        <Text style={{ color: '#374151', lineHeight: 20 }}>
          EMON is your energy monitoring companion—built to turn data into clear, actionable insights.
          Track real‑time consumption, explore historical analytics, and manage appliances—all in one place.
        </Text>
        <Text style={{ color: '#374151', marginTop: 8, lineHeight: 20 }}>
          Our mission is to help homes and businesses reduce waste, cut costs, and use energy smarter with a
          private, simple, and fast experience.
        </Text>
        <Text style={{ color: '#374151', marginTop: 8, lineHeight: 20 }}>
          How it works: connect your energy sensor(s), see live readings, get automatic insights on peaks and
          trends, and receive optional alerts when unusual activity occurs.
        </Text>
      </View>

      {/* Feature Accordion */}
      <AccordionSection icon="⚡" title="Key Features" defaultExpanded={true}>
        <FeatureItem icon="📈" text="Realtime monitoring with peak tracking"/>
        <FeatureItem icon="📊" text="Daily/Weekly/Monthly analytics"/>
        <FeatureItem icon="🔔" text="Smart notifications and reports"/>
        <FeatureItem icon="🕒" text="Timezone-aware data presentation"/>
        <FeatureItem icon="🔌" text="Appliance-level insights"/>
      </AccordionSection>

      {/* Technology Accordion */}
      <AccordionSection icon="🧩" title="Technology Stack" defaultExpanded={true} >
        <FeatureItem icon="⚛️" text="React Native (TypeScript)"/>
        <FeatureItem icon="🔥" text="Firebase: Auth, Firestore, Realtime DB, Storage"/>
        <FeatureItem icon="🧭" text="React Navigation"/>
      </AccordionSection>

      {/* App Info Accordion */}
      <AccordionSection icon="ℹ️" title="App Info" defaultExpanded={true}>
        <View style={[stylesAbout.infoCard]}>
          <Row icon="📱" style={stylesAbout.label} label="App" value="EMON User App" />
          <Row icon="🏷️" style={stylesAbout.label} label="Version" value="1.0.0" />
          <Row icon="🧪" style={stylesAbout.label} label="Build" value="2024.01.01" />
          <Row icon="👨‍💻" style={stylesAbout.label} label="Developer" value="EMON DevOps" />
          <View style={{ paddingTop: 4 }}>
            <Text style={stylesAbout.disclaimerText} accessibilityRole="text">
              {`Copyright © ${year} EMON. All rights reserved.`}
            </Text>
          </View>
        </View>
      </AccordionSection>


      {/* Quick Actions */}
      <View style={[settingsStyles.section, stylesAbout.actionsCard]}>
        <Text style={settingsStyles.sectionTitle}>Quick Actions</Text>
        <View style={stylesAbout.actionsRow}>
          <ActionButton
            color="#1976D2"
            bg="#E3F2FD"
            icon="📄"
            label="Terms of Service"
            onPress={() => navigation.navigate('TermsOfService')}
          />
          <ActionButton
            color="#2E7D32"
            bg="#E8F5E9"
            icon="❓"
            label="Help & FAQ"
            onPress={() => navigation.navigate('HelpFAQ')}
          />
        </View>
        <View style={stylesAbout.actionsRow}>
          <ActionButton
            color="#EF6C00"
            bg="#FFF3E0"
            icon="🙋"
            label="Contact Support"
            onPress={() => navigation.navigate('ContactSupport')}
          />
          <ActionButton
            color="#6A1B9A"
            bg="#F3E5F5"
            icon="🔒"
            label="Privacy Policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
        </View>
      </View>
      
    </ScrollView>
  );
};

export default AboutScreen;

// ---- Local Components ----

const AccordionSection: React.FC<{ title: string; icon?: string; defaultExpanded?: boolean; children?: React.ReactNode }> = ({
  title,
  icon,
  defaultExpanded = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <View style={settingsStyles.section}>
      <TouchableOpacity onPress={() => setOpen(v => !v)} style={stylesAbout.accordionHeader}>
        <Text style={stylesAbout.accordionIcon}>{icon ?? '•'}</Text>
        <Text style={stylesAbout.accordionTitle}>{title}</Text>
        <Text style={stylesAbout.accordionChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && <View style={{ marginTop: 8 }}>{children}</View>}
    </View>
  );
};

const FeatureItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={stylesAbout.featureRow}>
    <Text style={stylesAbout.featureIcon}>{icon}</Text>
    <Text style={stylesAbout.featureText}>{text}</Text>
  </View>
);

const Row: React.FC<{
  icon?: string;
  label: string;
  value: string;
  // Allow callers to pass either container (ViewStyle) or text style (TextStyle) here
  style?: StyleProp<ViewStyle | TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
}> = ({ icon, label, value, style, labelStyle, valueStyle }) => (
  <View style={[stylesAbout.row, style as StyleProp<ViewStyle>]}> 
    {icon ? <Text style={stylesAbout.rowIcon}>{icon}</Text> : null}
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={[stylesAbout.rowLabel, style as StyleProp<TextStyle>, labelStyle, { flex: 1, textAlign: 'left' }]}
    >
      {label}
    </Text>
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={[stylesAbout.rowValue, style as StyleProp<TextStyle>, valueStyle, { textAlign: 'right' }]}
    >
      {value}
    </Text>
  </View>
);

const ActionButton: React.FC<{ icon: string; label: string; onPress: () => void; color: string; bg: string }> = ({
  icon,
  label,
  onPress,
  color,
  bg,
}) => (
  <TouchableOpacity onPress={onPress} style={[stylesAbout.actionBtn, { backgroundColor: bg }]}> 
    <Text style={[stylesAbout.actionIcon, { color }]}>{icon}</Text>
    <Text style={[stylesAbout.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ---- Local Styles ----
const stylesAbout = StyleSheet.create({
  heroCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  appName: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: '#6B7280',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  label: {
    marginHorizontal: 8,
    justifyContent: 'space-between',
    textAlign: 'left',
    flex: 1,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    fontWeight: '600',
  },
  infoCard: {
    paddingVertical: 8,
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
  rowLabel: { color: '#374151' },
  rowValue: { color: '#111827', fontWeight: '600' },

  disclaimerText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
  },

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
  actionLabel: { fontSize: 14, fontWeight: '600' },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkIcon: { fontSize: 16, marginRight: 8 },
  linkText: { color: '#2563EB', fontWeight: '600' },

  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionIcon: { marginRight: 8 },
  accordionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  accordionChevron: { color: '#6B7280' },

  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  featureIcon: { marginRight: 8, fontSize: 16 },
  featureText: { color: '#374151', fontSize: 14, lineHeight: 20 },
});
