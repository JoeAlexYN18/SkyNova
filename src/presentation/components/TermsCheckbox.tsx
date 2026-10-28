import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/shared/theme';

interface TermsCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  error?: string;
}

const TERMS_URL = 'https://skynova.aero/terminos-de-servicio';
const PRIVACY_URL = 'https://skynova.aero/politica-de-privacidad';

export function TermsCheckbox({ checked, onToggle, error }: TermsCheckboxProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={[
            styles.checkbox,
            { borderColor: error ? colors.danger : colors.primary },
            checked && styles.checkboxChecked,
          ]}
        >
          {checked && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
        </TouchableOpacity>

        <Text style={styles.text}>
          Al registrarte, aceptas nuestros{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
            Términos de servicio
          </Text>{' '}
          y la{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
            Política de privacidad
          </Text>
          .
        </Text>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.round,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.primary },
  text: { flex: 1, ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  link: { color: colors.primary, textDecorationLine: 'underline', fontWeight: '700' },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
    marginLeft: 34,
  },
});
