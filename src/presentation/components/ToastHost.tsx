import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/shared/theme';
import { useToast } from '@/infrastructure/context/ToastContext';

const ICON_BY_TYPE = {
  success: 'checkmark-circle' as const,
  error: 'close-circle' as const,
  info: 'information-circle' as const,
};

const COLOR_BY_TYPE = {
  success: colors.success,
  error: colors.danger,
  info: colors.info,
};

/**
 * Renders the banner driven by `ToastContext`. Mount it once near the root
 * (see App.tsx) — any screen can then trigger it via `useToast().show(...)`.
 */
export function ToastHost() {
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  if (!toast.visible) return null;

  const color = COLOR_BY_TYPE[toast.type];

  return (
    <View style={[styles.wrapper, { top: insets.top + spacing.xxl }]} pointerEvents="none">
      <View style={[styles.toast, { borderColor: color }]}>
        <Ionicons name={ICON_BY_TYPE[toast.type]} size={18} color={color} />
        <Text style={styles.text} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 50,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { flex: 1, ...typography.caption, color: colors.textPrimary },
});
