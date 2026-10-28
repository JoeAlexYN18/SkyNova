import React, { useState } from 'react';
import { Link } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Country } from '@/domain/entities/Country';
import { DEFAULT_COUNTRY } from '@/infrastructure/data/countries';
import { colors, spacing, typography } from '@/shared/theme';
import { useCountries } from '../hooks/useCountries';
import { useRegisterForm } from '../hooks/useRegisterForm';
import { CountryPickerModal } from '../components/CountryPickerModal';
import { PasswordField } from '../components/PasswordField';
import { PhoneField } from '../components/PhoneField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { TermsCheckbox } from '../components/TermsCheckbox';
import { TextField } from '../components/TextField';

export function RegisterScreen() {
  const { countries, isLoading: isLoadingCountries } = useCountries();
  const { state, setField, submit } = useRegisterForm(DEFAULT_COUNTRY);
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
  const isIOS = Platform.OS === 'ios';

  const { values, errors, isSubmitting } = state;

  const handleSelectCountry = (country: Country) => setField('country', country);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={isIOS ? 'padding' : 'height'}
        keyboardVerticalOffset={isIOS ? 12 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollsChildToFocus
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            badge="El marketplace #1 de drones"
            title="Únete a SkyNova"
            subtitle="La plataforma líder de drones multimarca y despega tu flota hoy mismo"
          />

          <View style={styles.card}>
            <TextField
              label="Nombre completo"
              icon="person"
              placeholder="Ej. Alex Valdivia R."
              value={values.fullName}
              onChangeText={(text) => setField('fullName', text)}
              error={errors.fullName}
              autoCapitalize="words"
              autoComplete="name"
            />

            <TextField
              label="Correo electrónico"
              icon="mail"
              placeholder="correo@skynova.aero"
              value={values.email}
              onChangeText={(text) => setField('email', text)}
              error={errors.email}
              keyboardType="email-address"
              autoComplete="email"
            />

            <TextField
              label="Usuario"
              icon="at"
              placeholder="SKY-9240 o usuario"
              value={values.username}
              onChangeText={(text) => setField('username', text)}
              error={errors.username}
              autoComplete="username"
            />

            <PhoneField
              country={values.country}
              onPressCountry={() => setIsCountryPickerVisible(true)}
              number={values.phoneNumber}
              onChangeNumber={(text) => setField('phoneNumber', text)}
              error={errors.phoneNumber}
            />

            <PasswordField
              label="Contraseña"
              placeholder="Crea una contraseña segura"
              value={values.password}
              onChangeText={(text) => setField('password', text)}
              error={errors.password}
              autoComplete="new-password"
              showStrength
            />

            <PasswordField
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={values.confirmPassword}
              onChangeText={(text) => setField('confirmPassword', text)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            <TermsCheckbox
              checked={values.acceptedTerms}
              onToggle={() => setField('acceptedTerms', !values.acceptedTerms)}
              error={errors.acceptedTerms}
            />

            <PrimaryButton
              title="Crear cuenta"
              icon="person-add"
              loading={isSubmitting}
              onPress={submit}
            />
            <Text style={styles.loginPrompt}>
              ¿Ya tienes una cuenta activa?{' '}
              <Link href="/login" style={styles.loginLink}>
                Iniciar sesión
              </Link>
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.copyright}>
              © {new Date().getFullYear()} SKYNOVA. TODOS LOS DERECHOS RESERVADOS.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPickerModal
        visible={isCountryPickerVisible}
        onClose={() => setIsCountryPickerVisible(false)}
        onSelect={handleSelectCountry}
        countries={countries}
        isLoading={isLoadingCountries}
        selectedCode={values.country.code}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.xl,
  },
  loginPrompt: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  loginLink: { color: colors.primary, fontWeight: '700' },
  footer: { alignItems: 'center', marginTop: spacing.xxl },
  copyright: {
    ...typography.footer,
    color: colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});

