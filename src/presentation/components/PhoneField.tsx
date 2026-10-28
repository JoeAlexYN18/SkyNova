import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getExampleNumber, type CountryCode } from 'libphonenumber-js';
import mobileExamples from 'libphonenumber-js/mobile/examples';
import { Ionicons } from '@expo/vector-icons';
import { Country } from '@/domain/entities/Country';
import { colors, radius, spacing, typography } from '@/shared/theme';
import { FormField } from './FormField';

interface PhoneFieldProps {
  country: Country;
  onPressCountry: () => void;
  number: string;
  onChangeNumber: (text: string) => void;
  error?: string;
}

export function PhoneField({
  country,
  onPressCountry,
  number,
  onChangeNumber,
  error,
}: PhoneFieldProps) {
  const borderColor = error ? colors.borderError : colors.border;
  const placeholder = useMemo(
    () =>
      getExampleNumber(country.code as CountryCode, mobileExamples)?.formatNational() ??
      'Ingresa tu número',
    [country.code]
  );

  const handleChangeNumber = (input: string) => {
    let digits = input.replace(/\D/g, '');
    const dialCode = country.dialCode.replace(/\D/g, '');
    if (input.trim().startsWith('+') && digits.startsWith(dialCode)) {
      digits = digits.slice(dialCode.length);
    }
    onChangeNumber(digits);
  };

  return (
    <FormField label="Número de teléfono" error={error}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.countryPill, { borderColor }]}
          onPress={onPressCountry}
          accessibilityRole="button"
          accessibilityLabel={`País: ${country.name}, código ${country.dialCode}`}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.countryCode}>{country.code}</Text>
          <Text style={styles.dialCode}>{country.dialCode}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={[styles.numberBox, { borderColor }]}>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            value={number}
            onChangeText={handleChangeNumber}
            keyboardType="phone-pad"
            accessibilityLabel={`Número de teléfono de ${country.name}`}
            accessibilityHint={`Ingresa solo el número nacional, sin el prefijo ${country.dialCode}. Ejemplo: ${placeholder}.`}
          />
        </View>
      </View>
    </FormField>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  flag: { fontSize: 16 },
  countryCode: { ...typography.body, fontWeight: '700', color: colors.success },
  dialCode: { ...typography.body, color: colors.textPrimary },
  numberBox: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  input: { ...typography.body, color: colors.textPrimary, padding: 0 },
});
