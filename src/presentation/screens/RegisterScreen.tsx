import React, { useEffect, useRef, useState } from 'react';
import { Link, router } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [isCelebrating, setIsCelebrating] = useState(false);
  const actionStarted = useRef(false);
  const [celebration] = useState(() => new Animated.Value(0));
  const isIOS = Platform.OS === 'ios';

  const { values, errors, isSubmitting } = state;

  useEffect(() => {
    if (!isCelebrating) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isCelebrating]);

  const handleSelectCountry = (country: Country) => setField('country', country);

  const handleRegister = async () => {
    if (actionStarted.current || isCelebrating) return;
    actionStarted.current = true;
    Keyboard.dismiss();
    try {
      const registered = await submit();
      if (!registered) {
        actionStarted.current = false;
        return;
      }

      setIsCelebrating(true);
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      celebration.setValue(0);
      const animationFinished = new Promise<boolean>((resolve) => {
        Animated.timing(celebration, {
          toValue: 1,
          duration: reduceMotion ? 500 : 1900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => resolve(finished));
      });
      const finished = await animationFinished;
      if (finished) {
        router.replace('/home' as never);
        return;
      }
      setIsCelebrating(false);
      actionStarted.current = false;
    } catch {
      setIsCelebrating(false);
    } finally {
      actionStarted.current = false;
    }
  };

  const ringStyle = {
    opacity: celebration.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
    transform: [
      {
        scale: celebration.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0.4, 1, 1],
        }),
      },
    ],
  };

  const checkStyle = {
    opacity: celebration.interpolate({ inputRange: [0.18, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      {
        scale: celebration.interpolate({
          inputRange: [0.18, 0.42, 1],
          outputRange: [0, 1.25, 1],
        }),
      },
    ],
  };

  const titleStyle = {
    opacity: celebration.interpolate({ inputRange: [0.4, 0.65, 1], outputRange: [0, 1, 1] }),
    transform: [
      {
        translateY: celebration.interpolate({ inputRange: [0.4, 0.65, 1], outputRange: [14, 0, 0] }),
      },
    ],
  };

  const taglineStyle = {
    opacity: celebration.interpolate({ inputRange: [0.62, 0.85, 1], outputRange: [0, 1, 1] }),
    transform: [
      {
        translateY: celebration.interpolate({ inputRange: [0.62, 0.85, 1], outputRange: [10, 0, 0] }),
      },
    ],
  };

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
            subtitle={'La plataforma lider de drones multimarca.\nDespega tu flota hoy mismo.'}
          />

          <View style={styles.card}>
            <TextField
              label="Nombre completo"
              icon="person"
              placeholder="Ej. Joseph Alexander Yalico Nicho"
              value={values.fullName}
              onChangeText={(text) => setField('fullName', text)}
              error={errors.fullName}
              autoCapitalize="words"
              autoComplete="name"
            />

            <TextField
              label="Correo electrónico"
              icon="mail"
              placeholder="nombre@dominio.extensión"
              value={values.email}
              onChangeText={(text) => setField('email', text)}
              error={errors.email}
              keyboardType="email-address"
              autoComplete="email"
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
              loading={isSubmitting || isCelebrating}
              onPress={() => { void handleRegister(); }}
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

      {isCelebrating && (
        <View style={styles.celebrationOverlay}>
          <Animated.View style={[styles.ring, ringStyle]}>
            <Animated.View style={checkStyle}>
              <MaterialCommunityIcons name="check" size={52} color={colors.primary} />
            </Animated.View>
          </Animated.View>
          <Animated.Text style={[styles.celebrationTitle, titleStyle]}>
            ¡CUENTA CREADA!
          </Animated.Text>
          <Animated.Text style={[styles.celebrationTagline, taglineStyle]}>
            TODO LISTO PARA VOLAR
          </Animated.Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    elevation: 20,
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  celebrationTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 26,
    letterSpacing: 1,
    marginTop: spacing.xl,
  },
  celebrationTagline: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: spacing.sm,
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
