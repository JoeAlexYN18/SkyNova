import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/theme';
import { PASSWORD_STRENGTH_LABEL } from '@/shared/constants/messages';
import { PasswordStrength } from '@/shared/validators/formValidators';

const SEGMENTS = 4;

const COLOR_BY_KEY: Record<PasswordStrength['colorKey'], string> = {
  muted: colors.border,
  danger: colors.danger,
  warning: colors.warning,
  info: colors.info,
  success: colors.success,
};

/** Shows the current password-length level beside its field label. */
export function PasswordStrengthLabel({ score, colorKey }: PasswordStrength) {
  if (score === 0) return null;
  const activeColor = COLOR_BY_KEY[colorKey];
  const label = PASSWORD_STRENGTH_LABEL[score];

  return (
    <View style={styles.labelRow}>
      {score === 4 && (
        <Ionicons name="checkmark-circle" size={13} color={colors.success} />
      )}
      <Text style={[styles.label, { color: activeColor }]}>{label}</Text>
    </View>
  );
}

/** Shows the current password-length level beside its field label. */
export function PasswordStrengthBars({ score, colorKey }: PasswordStrength) {
  const activeColor = COLOR_BY_KEY[colorKey];
  return (
    <View style={styles.track}>
      {Array.from({ length: SEGMENTS }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            { backgroundColor: index < score ? activeColor : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: { ...typography.caption, fontWeight: '700' },
});
