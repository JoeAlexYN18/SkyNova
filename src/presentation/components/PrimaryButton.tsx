import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/shared/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  onPressIn?: () => void;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function PrimaryButton({ title, onPress, onPressIn, loading, icon }: PrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, (loading || pressed) && styles.buttonPressed]}
      onPress={onPress}
      onPressIn={onPressIn}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <View style={styles.content}>
          <Text style={styles.text}>{title}</Text>
          {icon && <Ionicons name={icon} size={18} color={colors.onPrimary} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 54,
    marginTop: spacing.xs,
    width: '100%',
  },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  text: { ...typography.button, color: colors.onPrimary },
});
