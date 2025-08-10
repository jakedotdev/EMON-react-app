import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { EnergyTotals } from '../managers/EnergyCalculator';

interface SummaryCardsProps {
  totals: EnergyTotals;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ totals }) => {
  // Calculate online percentage for visual indicator
  const onlinePercentage = totals.totalDevices > 0 ? (totals.onlineAppliances / totals.totalDevices) * 100 : 0;
  
  // Determine status colors
  const getEnergyColor = (energy: number) => {
    if (energy < 1) return '#4CAF50'; // Green - Low consumption
    if (energy < 5) return '#FF9800'; // Orange - Medium consumption
    return '#F44336'; // Red - High consumption
  };
  
  const getDeviceStatusColor = (percentage: number) => {
    if (percentage >= 80) return '#4CAF50'; // Green - Good
    if (percentage >= 50) return '#FF9800'; // Orange - Warning
    return '#F44336'; // Red - Critical
  };

  return (
    <View style={styles.summaryContainer}>
      {/* Total Energy Card */}
      <View style={[styles.summaryCard, styles.energyCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: getEnergyColor(totals.totalEnergy) + '20' }]}>
            <Text style={[styles.cardIcon, { color: getEnergyColor(totals.totalEnergy) }]}>⚡</Text>
          </View>
          <Text style={styles.summaryLabel}>Total Energy</Text>
        </View>
        <Text style={[styles.summaryValue, { color: getEnergyColor(totals.totalEnergy) }]}>
          {totals.totalEnergy.toFixed(2)}
        </Text>
        <Text style={styles.summaryUnit}>kWh</Text>
        <View style={[styles.statusIndicator, { backgroundColor: getEnergyColor(totals.totalEnergy) }]} />
      </View>
      
      {/* Total Devices Card */}
      <View style={[styles.summaryCard, styles.devicesCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#2196F3' + '20' }]}>
            <Text style={[styles.cardIcon, { color: '#2196F3' }]}>📱</Text>
          </View>
          <Text style={styles.summaryLabel}>Total Devices</Text>
        </View>
        <Text style={[styles.summaryValue, { color: '#2196F3' }]}>
          {totals.totalDevices}
        </Text>
        <Text style={styles.summaryUnit}>devices</Text>
        <View style={[styles.statusIndicator, { backgroundColor: '#2196F3' }]} />
      </View>
      
      {/* Online Appliances Card */}
      <View style={[styles.summaryCard, styles.onlineCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: getDeviceStatusColor(onlinePercentage) + '20' }]}>
            <Text style={[styles.cardIcon, { color: getDeviceStatusColor(onlinePercentage) }]}>🟢</Text>
          </View>
          <Text style={styles.summaryLabel}>Online Appliances</Text>
        </View>
        <Text style={[styles.summaryValue, { color: getDeviceStatusColor(onlinePercentage) }]}>
          {totals.onlineAppliances}
        </Text>
        <Text style={styles.summaryUnit}>
          {onlinePercentage.toFixed(0)}% online
        </Text>
        <View style={[styles.statusIndicator, { backgroundColor: getDeviceStatusColor(onlinePercentage) }]} />
        
        {/* Online percentage bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${onlinePercentage}%`,
                  backgroundColor: getDeviceStatusColor(onlinePercentage)
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
    minHeight: 120,
    justifyContent: 'space-between',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 4,
  },
  summaryUnit: {
    fontSize: 10,
    color: '#888',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  progressBarContainer: {
    width: '100%',
    marginTop: 4,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 2,
  },
  // Card-specific styles for subtle variations
  energyCard: {
    borderLeftWidth: 2,
    borderLeftColor: '#4CAF50',
  },
  devicesCard: {
    borderLeftWidth: 2,
    borderLeftColor: '#2196F3',
  },
  onlineCard: {
    borderLeftWidth: 2,
    borderLeftColor: '#4CAF50',
  },
});

export default SummaryCards;
