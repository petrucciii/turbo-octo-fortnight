import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  style?: any;
  minimumValue?: number;
  maximumValue?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
}

// Web-compatible slider using HTML range input
const WebSlider: React.FC<Props> = ({
  style,
  minimumValue = 0,
  maximumValue = 1,
  value = 0,
  onValueChange,
  minimumTrackTintColor = '#3498db',
  maximumTrackTintColor = '#333',
  thumbTintColor = '#fff',
}) => {
  const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;

  return (
    <View style={style}>
      <input
        type="range"
        min={minimumValue}
        max={maximumValue}
        value={value}
        step={1}
        onChange={(e) => onValueChange?.(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: 40,
          appearance: 'none' as any,
          WebkitAppearance: 'none' as any,
          background: `linear-gradient(to right, ${minimumTrackTintColor} 0%, ${minimumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} 100%)`,
          borderRadius: 8,
          outline: 'none',
          cursor: 'pointer',
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${thumbTintColor};
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${thumbTintColor};
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </View>
  );
};

export default WebSlider;
