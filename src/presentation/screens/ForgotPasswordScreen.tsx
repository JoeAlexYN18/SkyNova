import React, { useState } from 'react';
import { Link, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import { PasswordField } from '@/presentation/components/PasswordField';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { TextField } from '@/presentation/components/TextField';
import { MESSAGES } from '@/shared/constants/messages';
import { validateEmail, validatePassword, validateUsername } from '@/shared/validators/formValidators';
import { colors, spacing, typography } from '@/shared/theme';

export function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const { show } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) nextErrors.identifier = MESSAGES.LOGIN_IDENTIFIER_REQUIRED;
    else nextErrors.identifier = normalizedIdentifier.includes('@')
      ? validateEmail(normalizedIdentifier) ?? ''
      : validateUsername(normalizedIdentifier) ?? '';
    if (!nextErrors.identifier) delete nextErrors.identifier;
    const passwordError = validatePassword(password);
    if (passwordError) nextErrors.password = passwordError;
    if (!confirmPassword) nextErrors.confirmPassword = MESSAGES.REQUIRED;
    else if (password !== confirmPassword) nextErrors.confirmPassword = MESSAGES.PASSWORD_MISMATCH;
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const updated = await resetPassword(normalizedIdentifier, password);
      if (!updated) {
        setErrors({ identifier: 'No encontramos una cuenta con ese correo o usuario.' });
        return;
      }
      show('Tu contraseña se actualizó. Ya puedes iniciar sesión.', 'success');
      router.replace('/login' as never);
    } catch {
      show('No pudimos actualizar tu contraseña. Intenta nuevamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          scrollsChildToFocus
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.eyebrow}>RECUPERAR ACCESO</Text>
            <Text style={styles.title}>Crea una nueva contraseña</Text>
            <Text style={styles.description}>Ingresa el correo o usuario de tu cuenta y elige una contraseña nueva.</Text>

            <TextField
              label="Correo electrónico o usuario"
              icon="person"
              placeholder="Correo o nombre de usuario"
              value={identifier}
              onChangeText={(value) => { setIdentifier(value); setErrors((current) => ({ ...current, identifier: '' })); }}
              error={errors.identifier}
              autoCapitalize="none"
              autoComplete="username"
            />
            <PasswordField
              label="Nueva contraseña"
              placeholder="Crea una contraseña segura"
              value={password}
              onChangeText={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: '' })); }}
              error={errors.password}
              autoComplete="new-password"
              showStrength
            />
            <PasswordField
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChangeText={(value) => { setConfirmPassword(value); setErrors((current) => ({ ...current, confirmPassword: '' })); }}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
            <PrimaryButton title="Confirmar cambios" icon="checkmark" loading={isSubmitting} onPress={submit} />
            <Link href="/login" style={styles.backLink}>Volver a iniciar sesión</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl },
  eyebrow: { ...typography.badge, color: colors.primary, marginBottom: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xl },
  backLink: { ...typography.caption, color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: spacing.lg },
});
