import { View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { palette, space } from '../theme/tokens';
import { Text } from './ui';

/** Uygulama işareti: tuğla duvarın üstünde onay — "puantaj tamam". Kaynak: assets/logo.svg */
export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF57AE" />
          <Stop offset="1" stopColor="#FF8A3D" />
        </LinearGradient>
        <RadialGradient id="lh" cx="0.25" cy="0.15" r="0.8">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="1024" height="1024" rx="232" fill="url(#lg)" />
      <Rect width="1024" height="1024" rx="232" fill="url(#lh)" />
      <G fill="#FFFFFF">
        <Rect x="232" y="604" width="262" height="96" rx="22" opacity={0.95} />
        <Rect x="530" y="604" width="262" height="96" rx="22" opacity={0.95} />
        <Rect x="232" y="730" width="112" height="96" rx="22" opacity={0.72} />
        <Rect x="380" y="730" width="262" height="96" rx="22" opacity={0.72} />
        <Rect x="678" y="730" width="114" height="96" rx="22" opacity={0.72} />
      </G>
      <Path d="M300 420 L438 548 L736 252" fill="none" stroke="#FFFFFF" strokeWidth={104} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** İşaret + yazı */
export function Logo({ size = 40, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <LogoMark size={size} />
      <View>
        <Text variant="heading" style={{ fontSize: size * 0.5, lineHeight: size * 0.6, letterSpacing: -0.6 }}>
          İşçi Takip
        </Text>
        {subtitle ? (
          <Text variant="caption" color={palette.textSecondary}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
