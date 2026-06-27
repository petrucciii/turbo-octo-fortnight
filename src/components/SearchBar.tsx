import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';

interface Props {
  onPress: () => void;
  placeholder?: string;
  value?: string;
}

export const SearchBar: React.FC<Props> = ({ onPress, placeholder = "Dove vuoi andare?", value }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.searchBox}>
        <Text style={[styles.text, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchBox: {
    backgroundColor: '#1c1c1e',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  placeholder: {
    color: '#8e8e93',
  }
});
