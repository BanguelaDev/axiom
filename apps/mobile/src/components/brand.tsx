import { View } from 'react-native';
import { Copy } from '@/components/ui';
import { useApp } from '@/state/app-state';
import { spacing, sizes, radius } from '@/theme';

export function Brand() {
  const { colors } = useApp();
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="AXIOM"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.compact }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: sizes.brandMark,
          height: sizes.brandMark,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        }}
      >
        {[0.45, 1, 0.65].map((fraction, index) => (
          <View
            key={index}
            style={{
              height: sizes.brandMark * fraction,
              width: sizes.waveWidth,
              borderRadius: radius.full,
              backgroundColor: colors.accent,
            }}
          />
        ))}
      </View>
      <Copy variant="brand" accessible={false}>
        AXIOM
      </Copy>
    </View>
  );
}
