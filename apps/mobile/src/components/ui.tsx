import {
  Pressable,
  ScrollView,
  Text,
  View,
  type TextProps,
  type ViewStyle,
  type StyleProp,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ComponentProps, ReactNode } from 'react';
import { useApp } from '@/state/app-state';
import { spacing, typography, radius, sizes } from '@/theme';
export function Copy({
  variant = 'body',
  tone = 'text',
  style,
  ...props
}: TextProps & {
  variant?: keyof typeof typography;
  tone?: 'text' | 'secondary' | 'muted' | 'accent' | 'notice';
}) {
  const { colors } = useApp();
  return (
    <Text selectable {...props} style={[typography[variant], { color: colors[tone] }, style]} />
  );
}
export function Screen({ children }: { children: ReactNode }) {
  const { colors } = useApp();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        flexGrow: 1,
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <View
        style={{ width: '100%', maxWidth: sizes.content, alignSelf: 'center', gap: spacing.lg }}
      >
        {children}
      </View>
    </ScrollView>
  );
}
export function Icon({
  name,
  symbol,
  color,
  size = sizes.icon,
}: {
  name: ComponentProps<typeof MaterialCommunityIcons>['name'];
  symbol?: string;
  color?: ComponentProps<typeof MaterialCommunityIcons>['color'] | null;
  size?: number;
}) {
  const { colors } = useApp();
  if (process.env.EXPO_OS === 'ios' && symbol)
    return (
      <SymbolView
        name={symbol as SFSymbol}
        tintColor={color || colors.text}
        style={{ width: size, height: size }}
      />
    );
  return <MaterialCommunityIcons name={name} color={color || colors.text} size={size} />;
}
export function Button({
  title,
  onPress,
  secondary,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: sizes.touch,
          padding: spacing.md,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: secondary ? colors.elevated : colors.accent,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Copy variant="headline" style={{ color: secondary ? colors.text : colors.onAccent }}>
          {title}
        </Copy>
      )}
    </Pressable>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  const { colors } = useApp();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.compact,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderCurve: 'continuous',
      }}
    >
      <Icon name="information-outline" symbol="info.circle" color={colors.notice} />
      <View style={{ flex: 1 }}>
        <Copy variant="caption" tone="secondary">
          {children}
        </Copy>
      </View>
    </View>
  );
}
