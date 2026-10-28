import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/shared/theme';

interface ScreenHeaderProps {
  badge: string;
  title: string;
  subtitle: string;
}

export function ScreenHeader({ badge, title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <MaterialCommunityIcons name="quadcopter" size={13} color={colors.primary} />
        <Text style={styles.badgeText}>{badge}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: spacing.xxl },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.lg,
  },
  badgeText: { ...typography.badge, color: colors.primary, textTransform: 'uppercase' },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
