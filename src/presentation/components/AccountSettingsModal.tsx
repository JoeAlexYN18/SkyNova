import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Country } from '@/domain/entities/Country';
import type { UpdateUserProfileInput, User } from '@/domain/entities/User';
import { EmailAlreadyRegisteredError } from '@/domain/errors/UserErrors';
import { COUNTRIES } from '@/infrastructure/data/countries';
import { hasNetworkConnection, isFirebaseNetworkError } from '@/infrastructure/data/firebaseDataSync';
import { useToast } from '@/infrastructure/context/ToastContext';
import { CountryPickerModal } from '@/presentation/components/CountryPickerModal';
import { PasswordField } from '@/presentation/components/PasswordField';
import { PhoneField } from '@/presentation/components/PhoneField';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { TextField } from '@/presentation/components/TextField';
import { colors, radius, spacing } from '@/shared/theme';
import {
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhoneNumber,
} from '@/shared/validators/formValidators';

type FormValues = {
  fullName: string;
  email: string;
  phoneNumber: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
type FormField = keyof FormValues;
type FormErrors = Partial<Record<FormField, string>>;

export function AccountSettingsModal({
  user,
  visible,
  onClose,
  onSave,
  onDeleteAccount,
}: {
  user: User;
  visible: boolean;
  onClose: () => void;
  onSave: (input: UpdateUserProfileInput) => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
}) {
  const { show } = useToast();
  const [values, setValues] = useState<FormValues>(() => createValues(user));
  const [country, setCountry] = useState<Country>(() => countryForUser(user));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const countries = useMemo(() => COUNTRIES, []);

  const setField = (field: FormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    if (isSubmitting || isDeletingAccount) return;
    const emailChanged = values.email.trim().toLowerCase() !== user.email.toLowerCase();
    const wantsPasswordChange = values.newPassword.length > 0 || values.confirmPassword.length > 0;
    const nextErrors: FormErrors = {
      fullName: validateFullName(values.fullName),
      email: validateEmail(values.email),
      phoneNumber: validatePhoneNumber(values.phoneNumber, country.code),
    };
    if (emailChanged || wantsPasswordChange) {
      if (!values.currentPassword) nextErrors.currentPassword = 'Confirma tu contraseña actual.';
    }
    if (wantsPasswordChange) {
      nextErrors.newPassword = validatePassword(values.newPassword);
      nextErrors.confirmPassword = validateConfirmPassword(values.newPassword, values.confirmPassword);
    }
    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key as FormField]) delete nextErrors[key as FormField];
    });
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      show('Revisa los campos marcados antes de guardar.', 'error');
      return;
    }
    if (!(await hasNetworkConnection())) {
      show('Necesitas conexión a internet para actualizar tu cuenta.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        fullName: values.fullName.trim(),
        email: values.email.trim().toLowerCase(),
        phone: {
          countryCode: country.code,
          dialCode: country.dialCode,
          number: values.phoneNumber.replace(/\D/g, ''),
        },
        currentPassword: emailChanged || wantsPasswordChange ? values.currentPassword : undefined,
        newPassword: wantsPasswordChange ? values.newPassword : undefined,
      });
      show('Tu información se actualizó correctamente.', 'success');
      onClose();
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        setErrors((current) => ({ ...current, email: error.message }));
        show(error.message, 'error');
      } else {
        show(profileUpdateErrorMessage(error), 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteAccount = async () => {
    if (isSubmitting || isDeletingAccount) return;
    if (!deletePassword) {
      setDeleteError('Ingresa tu contraseña para confirmar la eliminación.');
      return;
    }
    if (!(await hasNetworkConnection())) {
      const message = 'Se necesita conexión a internet para eliminar la cuenta.';
      setDeleteError(message);
      show(message, 'error');
      return;
    }
    setDeleteError(null);
    setIsDeletingAccount(true);
    try {
      await onDeleteAccount(deletePassword);
      show('Tu cuenta y sus datos se eliminaron correctamente.', 'success');
      onClose();
    } catch (error) {
      const message = accountDeletionErrorMessage(error);
      setDeleteError(message);
      show(message, 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => {
      if (!isDeletingAccount) onClose();
    }}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={isDeletingAccount} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Volver al perfil">
            <MaterialCommunityIcons name="arrow-left" size={21} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi información</Text>
          <View style={styles.headerSpacer} />
        </View>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.intro}>
              <View style={styles.introIcon}><MaterialCommunityIcons name="account-edit-outline" size={24} color={colors.primary} /></View>
              <View style={styles.introCopy}>
                <Text style={styles.title}>Datos de tu cuenta</Text>
                <Text style={styles.subtitle}>Mantén tu información al día para que podamos ayudarte mejor.</Text>
              </View>
            </View>
            <View style={styles.formCard}>
              <TextField label="Nombre completo" icon="person" placeholder="Tu nombre y apellido" value={values.fullName} onChangeText={(text) => setField('fullName', text)} error={errors.fullName} autoCapitalize="words" autoComplete="name" />
              <TextField label="Correo electrónico" icon="mail" placeholder="nombre@dominio.com" value={values.email} onChangeText={(text) => setField('email', text)} error={errors.email} keyboardType="email-address" autoComplete="email" />
              <PhoneField country={country} onPressCountry={() => setIsCountryPickerVisible(true)} number={values.phoneNumber} onChangeNumber={(text) => setField('phoneNumber', text)} error={errors.phoneNumber} />

              {(values.email.trim().toLowerCase() !== user.email.toLowerCase() || isPasswordSectionOpen) && (
                <View style={styles.securityNote}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={17} color={colors.primary} />
                  <Text style={styles.securityNoteText}>Por seguridad, confirma tu contraseña actual para cambiar tus credenciales.</Text>
                </View>
              )}
              {(values.email.trim().toLowerCase() !== user.email.toLowerCase() || isPasswordSectionOpen) && (
                <PasswordField label="Contraseña actual" placeholder="Confirma tu contraseña" value={values.currentPassword} onChangeText={(text) => setField('currentPassword', text)} error={errors.currentPassword} autoComplete="current-password" />
              )}

              {!isPasswordSectionOpen ? (
                <TouchableOpacity style={styles.changePasswordButton} onPress={() => setIsPasswordSectionOpen(true)} accessibilityRole="button">
                  <MaterialCommunityIcons name="key-change" size={18} color={colors.primary} />
                  <Text style={styles.changePasswordText}>Cambiar contraseña</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.passwordSection}>
                  <Text style={styles.sectionTitle}>Nueva contraseña</Text>
                  <PasswordField label="Nueva contraseña" placeholder="Crea una contraseña segura" value={values.newPassword} onChangeText={(text) => setField('newPassword', text)} error={errors.newPassword} autoComplete="new-password" showStrength />
                  <PasswordField label="Confirmar contraseña nueva" placeholder="Repítela para confirmar" value={values.confirmPassword} onChangeText={(text) => setField('confirmPassword', text)} error={errors.confirmPassword} autoComplete="new-password" />
                  <TouchableOpacity
                    onPress={() => {
                      setIsPasswordSectionOpen(false);
                      setValues((current) => ({ ...current, newPassword: '', confirmPassword: '', currentPassword: '' }));
                      setErrors((current) => ({ ...current, newPassword: undefined, confirmPassword: undefined, currentPassword: undefined }));
                    }}
                    style={styles.cancelPasswordButton}
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelPasswordText}>No cambiar contraseña</Text>
                  </TouchableOpacity>
                </View>
              )}

              <PrimaryButton title="Guardar cambios" icon="checkmark" loading={isSubmitting} onPress={submit} />
            </View>
            <View style={styles.dangerZone}>
              <View style={styles.dangerHeading}>
                <MaterialCommunityIcons name="account-remove-outline" size={20} color={colors.danger} />
                <Text style={styles.dangerTitle}>Eliminar cuenta</Text>
              </View>
              <Text style={styles.dangerDescription}>
                Elimina de forma permanente tu cuenta y los datos asociados. Esta acción no se puede deshacer.
              </Text>
              {!isDeleteConfirmationOpen ? (
                <TouchableOpacity
                  style={styles.deleteAccountButton}
                  onPress={() => setIsDeleteConfirmationOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Continuar para eliminar la cuenta"
                >
                  <Text style={styles.deleteAccountButtonText}>Eliminar mi cuenta</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.deleteConfirmation}>
                  <Text style={styles.deleteWarning}>
                    Se borrarán tu perfil, carrito, direcciones, reseñas y pedidos de Firebase y de este dispositivo.
                  </Text>
                  <PasswordField
                    label="Confirma tu contraseña"
                    placeholder="Tu contraseña actual"
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    autoComplete="current-password"
                  />
                  <View style={styles.deleteActions}>
                    <TouchableOpacity
                      style={styles.cancelDeleteButton}
                      onPress={() => {
                        setIsDeleteConfirmationOpen(false);
                        setDeletePassword('');
                        setDeleteError(null);
                      }}
                      disabled={isDeletingAccount}
                      accessibilityRole="button"
                    >
                      <Text style={styles.cancelDeleteText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmDeleteButton, isDeletingAccount && styles.disabledDeleteButton]}
                      onPress={() => void deleteAccount()}
                      disabled={isDeletingAccount}
                      accessibilityRole="button"
                      accessibilityLabel="Confirmar eliminación permanente de la cuenta"
                    >
                      {isDeletingAccount
                        ? <ActivityIndicator size="small" color={colors.white} />
                        : <MaterialCommunityIcons name="delete-forever-outline" size={18} color={colors.white} />}
                      <Text style={styles.confirmDeleteText}>
                        {isDeletingAccount ? 'Eliminando…' : 'Eliminar definitivamente'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {deleteError && (
                    <Text accessibilityRole="alert" style={styles.deleteError}>
                      {deleteError}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <CountryPickerModal
          visible={isCountryPickerVisible}
          onClose={() => setIsCountryPickerVisible(false)}
          onSelect={(selected) => {
            setCountry(selected);
            setErrors((current) => ({ ...current, phoneNumber: undefined }));
          }}
          countries={countries}
          isLoading={false}
          selectedCode={country.code}
        />
      </SafeAreaView>
    </Modal>
  );
}

function firebaseErrorCode(error: unknown) {
  return error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';
}

function profileUpdateErrorMessage(error: unknown) {
  const code = firebaseErrorCode(error);
  if (isFirebaseNetworkError(error)) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
  }
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
    return 'La contraseña actual no es correcta.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'Por seguridad, vuelve a iniciar sesión y repite el cambio.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Ya existe una cuenta registrada con este correo.';
  }
  if (code === 'auth/weak-password') {
    return 'La nueva contraseña es muy débil.';
  }
  return 'No se pudo actualizar tu información. Inténtalo nuevamente.';
}

function accountDeletionErrorMessage(error: unknown) {
  if (isFirebaseNetworkError(error)) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
  }
  const code = firebaseErrorCode(error);
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'La contraseña no es correcta. Verifícala e inténtalo de nuevo.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'Por seguridad, vuelve a iniciar sesión y repite la eliminación de tu cuenta.';
  }
  if (code === 'permission-denied' || code === 'storage/unauthorized') {
    return 'Firebase rechazó la eliminación. Publica las reglas actualizadas de Firestore y Storage e inténtalo de nuevo.';
  }
  return 'No se pudo eliminar tu cuenta. Inténtalo nuevamente.';
}

function createValues(user: User): FormValues {
  return {
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phone.number,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
}

function countryForUser(user: User) {
  return COUNTRIES.find((country) => country.code === user.phone.countryCode) ?? COUNTRIES[0];
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 40 },
  content: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xxxl },
  intro: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  introIcon: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  introCopy: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
  formCard: { padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, marginVertical: spacing.md },
  securityNoteText: { flex: 1, color: colors.textSecondary, fontSize: 11, lineHeight: 17 },
  changePasswordButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, marginVertical: spacing.sm },
  changePasswordText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  passwordSection: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: spacing.md },
  cancelPasswordButton: { alignSelf: 'flex-start', paddingVertical: spacing.md, marginBottom: spacing.md },
  cancelPasswordText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  dangerZone: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderError },
  dangerHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dangerTitle: { color: colors.danger, fontSize: 15, fontWeight: '800' },
  dangerDescription: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  deleteAccountButton: { alignSelf: 'flex-start', marginTop: spacing.md, paddingVertical: spacing.sm },
  deleteAccountButtonText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  deleteConfirmation: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  deleteWarning: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
  deleteActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md },
  cancelDeleteButton: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  cancelDeleteText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  confirmDeleteButton: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.danger },
  disabledDeleteButton: { opacity: 0.65 },
  confirmDeleteText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  deleteError: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
});
