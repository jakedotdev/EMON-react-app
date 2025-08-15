import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Linking } from 'react-native';
import { settingsStyles } from '../../../settings/styles';

export type SupportQuickActionsProps = {
  onEmailSupport?: () => void;
  onMyReports?: () => void;
  onReportBug?: () => void;
  onRateUs?: () => void;
};

const SupportQuickActions: React.FC<SupportQuickActionsProps> = ({
  onEmailSupport,
  onMyReports,
  onReportBug,
  onRateUs,
}) => {
  return (
    <View style={[settingsStyles.section, styles.actionsCard]}>
      <Text style={settingsStyles.sectionTitle}>Quick actions</Text>
      <View style={styles.actionsRow}>
        <ActionButton
          color="#1976D2"
          bg="#E3F2FD"
          icon="📬"
          label="Email Support"
          onPress={onEmailSupport || (() => Linking.openURL('mailto:support@emon.app'))}
        />
        <ActionButton
          color="#2E7D32"
          bg="#E8F5E9"
          icon="📄"
          label="My Reports"
          onPress={onMyReports}
        />
      </View>
      <View style={styles.actionsRow}>
        <ActionButton
          color="#EF6C00"
          bg="#FFE0E0"
          icon="🐞"
          label="Report a Bug"
          onPress={onReportBug}
        />
        <ActionButton
          color="#F59E0B"
          bg="#FFF3E0"
          icon="⭐"
          label="Rate us"
          onPress={onRateUs}
        />
      </View>
    </View>
  );
};

const ActionButton: React.FC<{ icon: string; label: string; onPress?: () => void; color: string; bg: string }> = ({
  icon,
  label,
  onPress,
  color,
  bg,
}) => (
  <TouchableOpacity onPress={onPress} style={[styles.actionBtn, { backgroundColor: bg }]}> 
    <Text style={[styles.actionIcon, { color }]}>{icon}</Text>
    <Text style={[styles.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
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
});

export default SupportQuickActions;
