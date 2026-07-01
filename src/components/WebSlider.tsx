import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

type RangeInputStyle = React.CSSProperties & {
  WebkitAppearance?: React.CSSProperties['appearance'];
};

interface Props {
  style?: StyleProp<ViewStyle>;
  minimumValue?: number;
  maximumValue?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
}

// The native slider package does not render consistently on web, so this
// component keeps the same prop shape while delegating to an HTML range input.
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
  const range = maximumValue - minimumValue;
  const percentage = range > 0 ? ((value - minimumValue) / range) * 100 : 0;
  const inputStyle: RangeInputStyle = {
    width: '100%',
    height: 40,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: `linear-gradient(to right, ${minimumTrackTintColor} 0%, ${minimumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} 100%)`,
    borderRadius: 8,
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <View style={style}>
      <input
        type="range"
        min={minimumValue}
        max={maximumValue}
        value={value}
        step={1}
        onChange={(e) => onValueChange?.(parseFloat(e.target.value))}
        style={inputStyle}
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
