import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius } from '@/shared/theme';

export function BrandLogo({ size = 84, iconSize = 54 }: { size?: number; iconSize?: number }) {
  return (
    <View
      style={[styles.mark, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Logotipo SkyNova con un dron"
    >
      <MaterialCommunityIcons name="quadcopter" size={iconSize} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.45)',
    borderRadius: radius.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
