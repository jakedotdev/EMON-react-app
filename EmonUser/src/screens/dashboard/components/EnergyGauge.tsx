import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GaugeManager, GaugeInterval } from '../managers/GaugeManager';

interface EnergyGaugeProps {
  currentEnergy: number;
  gaugeManager: GaugeManager;
  onSettingsPress: () => void;
}

const EnergyGauge: React.FC<EnergyGaugeProps> = ({ 
  currentEnergy, 
  gaugeManager, 
  onSettingsPress 
}) => {
  const intervals = gaugeManager.generateIntervals();
  const progress = gaugeManager.calculateGaugeProgress(currentEnergy);
  const gaugeColor = gaugeManager.getGaugeColor(currentEnergy);
  const settings = gaugeManager.getSettings();
  const gaugeWidth = 280; // Fixed width for calculations

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeLabelContainer}>
        <Text style={styles.gaugeLabel}>Total Energy Consumption</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.gaugeSettingsButton}
        onPress={onSettingsPress}
      >
        <Text style={styles.gaugeSettingsIcon}>⚙️</Text>
      </TouchableOpacity>

      <View style={styles.gaugeWrapper}>
        {/* Interval Marks - Moved above the gauge */}
        <View style={styles.gaugeMarks}>
          {intervals.map((interval) => {
            const position = (interval.value / settings.maxValue) * gaugeWidth;
            
            return (
              <View
                key={interval.value}
                style={[
                  styles.gaugeMark,
                  { left: position }
                ]}
              >
                <Text style={styles.markLabel}>{interval.value}</Text>
                <View style={styles.markTick} />
              </View>
            );
          })}
        </View>

        {/* Main Gauge Bar */}
        <View style={[styles.gaugeTrack, { width: gaugeWidth }]}>
          <View 
            style={[
              styles.gaugeProgress, 
              { 
                width: `${progress}%`,
                backgroundColor: gaugeColor
              }
            ]} 
          />
        </View>

        {/* Current Value Display */}
        <View style={styles.currentValueContainer}>
          <Text style={styles.currentValue}>
            {GaugeManager.formatGaugeValue(currentEnergy)}
          </Text>
          <Text style={styles.currentUnit}>kWh</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gaugeContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  gaugeLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  gaugeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  gaugeSettingsButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    padding: 8,
  },
  gaugeSettingsIcon: {
    fontSize: 20,
  },
  gaugeWrapper: {
    alignItems: 'center',
    marginTop: 30,
    position: 'relative',
  },
  gaugeTrack: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  gaugeProgress: {
    height: '100%',
    borderRadius: 10,
  },
  currentValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 15,
    marginBottom: 20,
  },
  currentValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  currentUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  gaugeMarks: {
    position: 'relative',
    width: 280,
    height: 40,
    marginBottom: 10, // Add space between marks and gauge
  },
  gaugeMark: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -10 }],
  },
  markLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
    minWidth: 20,
  },
  markTick: {
    width: 2,
    height: 8,
    backgroundColor: '#999',
  },
});

export default EnergyGauge;
