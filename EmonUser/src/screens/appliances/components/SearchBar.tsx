import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface Props {
  value: string;
  onChange: (text: string) => void;
}

const SearchBar: React.FC<Props> = ({ value, onChange }) => (
  <View style={styles.container}>
    <TextInput
      style={styles.input}
      placeholder="Search appliances..."
      value={value}
      onChangeText={onChange}
      placeholderTextColor="#999999"
    />
  </View>
);

const styles = StyleSheet.create({
  container: { paddingHorizontal: 4, marginTop: 4 },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});

export default SearchBar;
