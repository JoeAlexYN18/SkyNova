import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/shared/theme';
import { getPasswordStrength } from '@/shared/validators/formValidators';
import { FormField } from './FormField';
import { PasswordStrengthBars, PasswordStrengthLabel } from './PasswordStrengthMeter';

interface PasswordFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  autoComplete?: TextInputProps['autoComplete'];
  rightOfLabel?: React.ReactNode;

  showStrength?: boolean;
}

export function PasswordField({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  autoComplete,
  rightOfLabel,
  showStrength = false,
}: PasswordFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const strength = showStrength ? getPasswordStrength(value) : undefined;

  const borderColor = error
    ? colors.borderError
    : isFocused
    ? colors.borderFocused
    : colors.border;

  return (
    <FormField
      label={label}
      error={error}
      rightOfLabel={
        rightOfLabel ?? (strength ? <PasswordStrengthLabel {...strength} /> : undefined)
      }
    >
      <View style={[styles.inputRow, { borderColor }]}>
        <Ionicons
          name="lock-closed"
          size={18}
          color={isFocused ? colors.primary : colors.textMuted}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={value}
          accessibilityLabel={label}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={!isVisible}
          autoCapitalize="none"
          autoComplete={autoComplete}
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setIsVisible((v) => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <Ionicons
            name={isVisible ? 'eye-off' : 'eye'}
            size={19}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>
      {strength && <PasswordStrengthBars {...strength} />}
    </FormField>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    height: '100%',
    padding: 0,
  },
});
