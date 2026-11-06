import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { faceInk, faceScale } from '@/theme/tokens';

// Mouth paths on a 100 x 100 face, 0 = big smile (green) ... 4 = frown (red).
const MOUTHS = [
  'M30 60 Q50 82 70 60',
  'M33 63 Q50 75 67 63',
  'M34 67 L66 67',
  'M34 70 Q50 62 66 70',
  'M32 74 Q50 58 68 74',
];

export interface FaceIconProps {
  index: number; // 0 = green ... 4 = red
  size?: number;
}

// Drawn face (no emoji). Decorative: always shown next to a text label, so hidden from screen readers.
export function FaceIcon({ index, size = 48 }: FaceIconProps) {
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="48" fill={faceScale[index]} />
        <Circle cx="35" cy="40" r="6" fill={faceInk} />
        <Circle cx="65" cy="40" r="6" fill={faceInk} />
        <Path
          d={MOUTHS[index]}
          stroke={faceInk}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
