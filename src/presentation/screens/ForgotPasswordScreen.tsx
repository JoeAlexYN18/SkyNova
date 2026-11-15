import React, { useRef, useState } from 'react';
import { Link, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import { PasswordField } from '@/presentation/components/PasswordField';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { TextField } from '@/presentation/components/TextField';
import { MESSAGES } from '@/shared/constants/messages';
import { validateEmail, validatePassword } from '@/shared/validators/formValidators';
import { colors, spacing, typography } from '@/shared/theme';
import { firebaseConfigured } from '@/infrastructure/data/firebaseServices';
import { isFirebaseNetworkError } from '@/infrastructure/data/firebaseDataSync';

export function ForgotPasswordScreen() {
  const { resetPassword, sendPasswordReset } = useAuth();
  const { show } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);

  const submit = async () => {
    if (submitLock.current) return;
    const nextErrors: Record<string, string> = {};
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) nextErrors.identifier = MESSAGES.LOGIN_IDENTIFIER_REQUIRED;
    else nextErrors.identifier = validateEmail(normalizedIdentifier) ?? '';
    if (!nextErrors.identifier) delete nextErrors.identifier;
    const passwordError = firebaseConfigured ? '' : validatePassword(password);
    if (passwordError) nextErrors.password = passwordError;
    if (!firebaseConfigured && !confirmPassword) nextErrors.confirmPassword = MESSAGES.REQUIRED;
    else if (!firebaseConfigured && password !== confirmPassword) nextErrors.confirmPassword = MESSAGES.PASSWORD_MISMATCH;
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    submitLock.current = true;
    setIsSubmitting(true);
    try {
      if (firebaseConfigured) {
        await sendPasswordReset(normalizedIdentifier);
        show('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.', 'success');
        router.replace('/login' as never);
        return;
      }
      const updated = await resetPassword(normalizedIdentifier, password);
      if (!updated) {
        setErrors({ identifier: 'No encontramos una cuenta con ese correo electrónico.' });
        return;
      }
      show('Tu contraseña se actualizó. Ya puedes iniciar sesión.', 'success');
      router.replace('/login' as never);
    } catch (error) {
      if (isFirebaseNetworkError(error)) {
        show(MESSAGES.NETWORK_ERROR, 'error');
      } else {
        show(
          firebaseConfigured
            ? 'No pudimos enviar el correo de recuperación. Inténtalo nuevamente.'
            : 'No pudimos actualizar tu contraseña. Intenta nuevamente.',
          'error',
        );
      }
    } finally {
      submitLock.current = false;
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
            <Text style={styles.title}>{firebaseConfigured ? 'Recupera tu acceso' : 'Crea una nueva contraseña'}</Text>
            <Text style={styles.description}>{firebaseConfigured
              ? 'Te enviaremos un enlace seguro para crear una contraseña nueva.'
              : 'Ingresa el correo electrónico de tu cuenta y elige una contraseña nueva.'}</Text>

            <TextField
              label="Correo electrónico"
              icon="person"
              placeholder="nombre@dominio.extensión"
              value={identifier}
              onChangeText={(value) => { setIdentifier(value); setErrors((current) => ({ ...current, identifier: '' })); }}
              error={errors.identifier}
              autoCapitalize="none"
              autoComplete="email"
            />
            {!firebaseConfigured && <PasswordField
              label="Nueva contraseña"
              placeholder="Crea una contraseña segura"
              value={password}
              onChangeText={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: '' })); }}
              error={errors.password}
              autoComplete="new-password"
              showStrength
            />}
            {!firebaseConfigured && <PasswordField
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChangeText={(value) => { setConfirmPassword(value); setErrors((current) => ({ ...current, confirmPassword: '' })); }}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />}
            <PrimaryButton title={firebaseConfigured ? 'Enviar enlace' : 'Confirmar cambios'} icon="checkmark" loading={isSubmitting} onPress={submit} />
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
