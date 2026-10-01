import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

// Placeholder "P" mascot from the logo brief: sky-blue letter P with eyes, glasses, mouth,
// hands, feet, a school ID and a book. Swap for the group's final logo art when ready.
export function Mascot({ size = 120, waving = false }: { size?: number; waving?: boolean }) {
  const ink = '#16324A';
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 200 230">
      {/* feet */}
      <Ellipse cx={68} cy={214} rx={20} ry={9} fill={ink} />
      <Ellipse cx={112} cy={214} rx={20} ry={9} fill={ink} />
      <Rect x={62} y={196} width={10} height={16} fill={colors.primaryDark} />
      <Rect x={106} y={196} width={10} height={16} fill={colors.primaryDark} />
      {/* body: the letter P with a small counter */}
      <Path
        d="M64 22 H122 A56 56 0 0 1 122 134 H108 V190 Q108 202 96 202 H70 Q58 202 58 190 V30 Q58 22 64 22 Z M108 96 H124 A12 12 0 0 1 124 120 H108 Z"
        fill={colors.brand}
        fillRule="evenodd"
        stroke={colors.primaryDark}
        strokeWidth={3}
      />
      {/* uniform collar and tie */}
      <Path d="M70 132 L83 146 L96 132" fill="#fff" stroke={colors.primaryDark} strokeWidth={2} />
      <Path d="M83 146 L78 160 L83 168 L88 160 Z" fill={colors.primary} />
      {/* glasses + eyes */}
      <G>
        <Circle cx={88} cy={62} r={14} fill="#fff" stroke={ink} strokeWidth={3.5} />
        <Circle cx={124} cy={62} r={14} fill="#fff" stroke={ink} strokeWidth={3.5} />
        <Line x1={102} y1={62} x2={110} y2={62} stroke={ink} strokeWidth={3.5} />
        <Circle cx={90} cy={64} r={5.5} fill={ink} />
        <Circle cx={126} cy={64} r={5.5} fill={ink} />
        <Circle cx={92} cy={62} r={1.8} fill="#fff" />
        <Circle cx={128} cy={62} r={1.8} fill="#fff" />
      </G>
      {/* blush + smile */}
      <Circle cx={76} cy={84} r={6} fill="#F7A8B8" opacity={0.7} />
      <Circle cx={138} cy={84} r={6} fill="#F7A8B8" opacity={0.7} />
      <Path d="M96 84 Q106 96 116 84" fill="none" stroke={ink} strokeWidth={3.5} strokeLinecap="round" />
      {/* ID lanyard and card */}
      <Path d="M66 100 L83 118 L100 100" fill="none" stroke={colors.primary} strokeWidth={2.5} />
      <Rect x={74} y={116} width={18} height={14} rx={2} fill="#fff" stroke={ink} strokeWidth={1.5} />
      <Circle cx={79} cy={122} r={2.5} fill={colors.brand} />
      <Line x1={83} y1={121} x2={89} y2={121} stroke={ink} strokeWidth={1.2} />
      <Line x1={83} y1={125} x2={89} y2={125} stroke={ink} strokeWidth={1.2} />
      {/* arms */}
      <Path d="M58 150 Q40 158 36 172" fill="none" stroke={colors.primaryDark} strokeWidth={5} strokeLinecap="round" />
      {waving ? (
        <Path d="M108 118 Q138 112 150 90" fill="none" stroke={colors.primaryDark} strokeWidth={5} strokeLinecap="round" />
      ) : (
        <Path d="M108 150 Q126 158 130 172" fill="none" stroke={colors.primaryDark} strokeWidth={5} strokeLinecap="round" />
      )}
      {/* book held in front */}
      <G>
        <Rect x={30} y={166} width={66} height={30} rx={3} fill="#fff" stroke={ink} strokeWidth={2.5} />
        <Rect x={30} y={166} width={10} height={30} rx={2} fill={colors.primary} />
        <Line x1={48} y1={176} x2={86} y2={176} stroke={colors.border} strokeWidth={3} />
        <Line x1={48} y1={185} x2={78} y2={185} stroke={colors.border} strokeWidth={3} />
      </G>
      {/* hands */}
      <Circle cx={36} cy={174} r={6} fill={colors.brand} stroke={colors.primaryDark} strokeWidth={2} />
      {waving ? (
        <Circle cx={152} cy={86} r={7} fill={colors.brand} stroke={colors.primaryDark} strokeWidth={2} />
      ) : (
        <Circle cx={130} cy={174} r={6} fill={colors.brand} stroke={colors.primaryDark} strokeWidth={2} />
      )}
    </Svg>
  );
}
