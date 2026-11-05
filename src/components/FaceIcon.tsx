import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { faceInk, faceScale } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

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
  selected?: boolean; // 3 pt primary ring
}

// Drawn face (no emoji). Decorative: always shown next to a text label, so hidden from screen readers.
export function FaceIcon({ index, size = 56, selected = false }: FaceIconProps) {
  const { colors } = useTheme();
  const box = size + 10; // room for the ring, so selecting never moves the layout

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID={selected ? 'face-selected' : undefined}
      style={{
        width: box,
        height: box,
        borderRadius: box / 2,
        borderWidth: 3,
        borderColor: selected ? colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
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
