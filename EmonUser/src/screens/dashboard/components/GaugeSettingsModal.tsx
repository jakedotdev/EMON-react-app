import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { GaugeManager } from '../managers/GaugeManager';

interface GaugeSettingsModalProps {
  visible: boolean;
  gaugeManager: GaugeManager;
  onSave: (maxValue: number, divisor: number) => void;
  onCancel: () => void;
}

const GaugeSettingsModal: React.FC<GaugeSettingsModalProps> = ({
  visible,
  gaugeManager,
  onSave,
  onCancel,
}) => {
  const settings = gaugeManager.getSettings();
  const [maxValue, setMaxValue] = useState(settings.maxValue.toString());
  const [selectedDivisor, setSelectedDivisor] = useState(settings.divisor);

  const handleSave = () => {
    const maxVal = parseInt(maxValue) || 1;
    onSave(maxVal, selectedDivisor);
  };

  const handleCancel = () => {
    // Reset to current settings
    setMaxValue(settings.maxValue.toString());
    setSelectedDivisor(settings.divisor);
    onCancel();
  };

  const maxVal = parseInt(maxValue) || 1;
  const validationMessage = gaugeManager.getValidationMessage(maxVal, selectedDivisor);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Gauge Settings</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Maximum Value (kWh):</Text>
            <TextInput
              style={styles.settingInput}
              value={maxValue}
              onChangeText={(text) => {
                const value = parseInt(text) || 1;
                if (value >= 1 && value <= 50) {
                  setMaxValue(text);
                }
              }}
              keyboardType="numeric"
              placeholder="Enter max value"
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Interval Divisor:</Text>
            <View style={styles.divisorButtons}>
              {[1, 2, 3, 5].map((divisor) => (
                <TouchableOpacity
                  key={divisor}
                  style={[
                    styles.divisorButton,
                    selectedDivisor === divisor && styles.divisorButtonActive
                  ]}
                  onPress={() => setSelectedDivisor(divisor)}
                >
                  <Text style={[
                    styles.divisorButtonText,
                    selectedDivisor === divisor && styles.divisorButtonTextActive
                  ]}>
                    {divisor === 1 ? '1 (Every unit)' : `${divisor}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <Text style={styles.settingHint}>
            Range: 1-50 kWh. Choose divisor (1, 2, 3, 5) for interval spacing.
            {validationMessage && `\n${validationMessage}`}
          </Text>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSave}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F8F8',
  },
  divisorButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  divisorButton: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  divisorButtonActive: {
    backgroundColor: '#5B934E',
    borderColor: '#5B934E',
  },
  divisorButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  divisorButtonTextActive: {
    color: '#FFFFFF',
  },
  settingHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#95A5A6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#5B934E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default GaugeSettingsModal;
