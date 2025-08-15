import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { settingsStyles } from '../../settings/styles';

const HelpFaqScreen: React.FC = () => {
  return (
    <ScrollView style={settingsStyles.container}>
      {/* Document Card */}
      <View style={settingsStyles.section}>
        <View style={stylesHelp.card}>
          <Text style={stylesHelp.title}>Help & FAQ</Text>
          <Text style={stylesHelp.subtitle}>
            Quick answers to common questions about using EMON.
          </Text>
          <View style={stylesHelp.divider} />

          <FAQItem question="How do I add or manage my energy devices?">
            Go to Settings → Devices. Tap “Add Device” and follow the steps to pair your sensor. You can
            rename devices, set rooms, and remove devices from the same screen.
          </FAQItem>

          <FAQItem question="How do I change my timezone and units?">
            Open Settings → Preferences. Update your timezone and choose your preferred units (kWh, W).
            Changes apply immediately across analytics and history.
          </FAQItem>

          <FAQItem question="Why don’t I see real‑time readings?">
            Ensure your sensor is powered and connected to the network. If readings are delayed, check your
            internet connection. You can also pull‑to‑refresh on the dashboard.
          </FAQItem>

          <FAQItem question="How do alerts and notifications work?">
            In Settings → Notifications, enable the alerts you want (e.g., high usage spikes). Make sure
            system notifications are allowed for EMON in your device settings.
          </FAQItem>

          <FAQItem question="How do I export my data?">
            Go to Settings → Data & Privacy, then tap “Export Data.” You’ll receive a file via email
            containing your usage history for the selected time range.
          </FAQItem>

          <FAQItem question="Need more help?">
            Visit our online Help Center or contact Support. We typically respond within 24‑48 hours.
          </FAQItem>

          <View style={stylesHelp.ctaBlock}>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:support@emon.app?subject=EMON%20Support%20Request')}>
              <Text style={stylesHelp.link}>Email Support →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://emon.app/help')}>
              <Text style={[stylesHelp.link, { marginTop: 8 }]}>View Help Center →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default HelpFaqScreen;

// ---- Local components ----
const FAQItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={stylesHelp.faqCard}>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
        style={stylesHelp.faqHeader}
      >
        <Text style={stylesHelp.faqTitle}>{question}</Text>
        <Text style={stylesHelp.faqIcon}>{open ? '−' : '+'}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={stylesHelp.faqBody}>
          <Text style={stylesHelp.answer}>{children}</Text>
        </View>
      ) : null}
    </View>
  );
};

// ---- Local styles ----
const stylesHelp = StyleSheet.create({
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
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20, color: '#6B7280' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginTop: 12, marginBottom: 10 },
  question: { marginTop: 10, fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#111827' },
  answer: { marginTop: 6, color: '#374151', lineHeight: 20 },
  link: { color: '#2563EB', fontWeight: '600' },
  ctaBlock: { marginTop: 12 },
  faqCard: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#111827', flex: 1, paddingRight: 12 },
  faqIcon: { fontSize: 20, color: '#6B7280', width: 20, textAlign: 'right' },
  faqBody: { marginTop: 6 },
});
