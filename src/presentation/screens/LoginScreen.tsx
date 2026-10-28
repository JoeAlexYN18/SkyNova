import React, { useEffect, useRef, useState } from 'react';
import { Link, router } from 'expo-router';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '@/presentation/components/BrandLogo';
import { PasswordField } from '@/presentation/components/PasswordField';
import { PrimaryButton } from '@/presentation/components/PrimaryButton';
import { TextField } from '@/presentation/components/TextField';
import { useLoginForm } from '@/presentation/hooks/useLoginForm';
import { colors, radius, spacing, typography } from '@/shared/theme';
import { MESSAGES } from '@/shared/constants/messages';
import { useToast } from '@/infrastructure/context/ToastContext';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { DEMO_CREDENTIALS } from '@/infrastructure/data/demoCredentials';

export function LoginScreen() {
  const { state, setIdentifier, setPassword, submit } = useLoginForm();
  const { login } = useAuth();
  const { show } = useToast();
  const [isFlying, setIsFlying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const actionStarted = useRef(false);
  const [flight] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!isFlying) return;
    flight.setValue(0);
    Animated.timing(flight, {
      toValue: 1,
      duration: 1400,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      flight.stopAnimation();
    };
  }, [flight, isFlying]);

  const handleLogin = async () => {
    if (actionStarted.current || isStarting || isFlying) return;
    actionStarted.current = true;
    setIsStarting(true);
    // Show immediate feedback on touch, while credentials are checked.
    setIsFlying(true);
    try {
      // Try the values shown in the fields first. In this no-backend demo,
      // fall back to the seeded account so the main CTA always has a valid path.
      const authenticated = await submit();
      if (!authenticated) {
        await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
      }
      // Keep the logo flight visible for its full duration, then enter Home.
      setTimeout(() => router.replace('/home' as never), 1500);
    } catch {
      setIsFlying(false);
      actionStarted.current = false;
      show(MESSAGES.LOGIN_GENERIC_ERROR, 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const flightStyle = {
    opacity: flight.interpolate({ inputRange: [0, 0.18, 0.8, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateY: flight.interpolate({ inputRange: [0, 1], outputRange: [160, -200] }) },
      { translateX: flight.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-35, 25, 70] }) },
      { scale: flight.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.7, 1.5, 0.8] }) },
      { rotate: flight.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-18deg', '12deg', '-8deg'] }) },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <BrandLogo />
            <Text style={styles.badge}>EL MARKETPLACE #1 DE DRONES</Text>
            <Text style={styles.brandName}>SkyNova</Text>
            <Text style={styles.subtitle}>
              Drones multimarca al mejor precio.{"\n"}Compra, gestiona y despega.
            </Text>

            <View style={styles.card}>
              <TextField
                label="Correo electrónico o usuario"
                icon="person"
                placeholder={DEMO_CREDENTIALS.username}
                value={state.identifier}
                onChangeText={setIdentifier}
                error={state.errors.identifier}
                autoComplete="username"
              />

              <PasswordField
                label="Contraseña"
                placeholder="Ingresa tu contraseña"
                value={state.password}
                onChangeText={setPassword}
                error={state.errors.password}
                autoComplete="current-password"
                rightOfLabel={
                  <Text
                    style={styles.forgotLink}
                    onPress={() => show(MESSAGES.PASSWORD_RECOVERY_UNAVAILABLE, 'info')}
                    accessibilityRole="link"
                  >
                    ¿Olvidaste tu contraseña?
                  </Text>
                }
              />

              <PrimaryButton
                title="Iniciar sesión"
                icon="log-in"
                loading={state.isSubmitting || isStarting || isFlying}
                onPress={handleLogin}
                onPressIn={handleLogin}
              />
              <Text style={styles.demoHint}>
                Usuario: {DEMO_CREDENTIALS.username} · Contraseña: {DEMO_CREDENTIALS.password}
              </Text>
            </View>

            <Text style={styles.registerPrompt}>
              ¿Aún no tienes una cuenta?{' '}
              <Link href="/register" style={styles.registerLink}>
                Regístrate ›
              </Link>
            </Text>
            <Text style={styles.copyright}>
              © {new Date().getFullYear()} SKYNOVA. TODOS LOS DERECHOS RESERVADOS.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {isFlying && (
        <View style={styles.flightOverlay}>
          <View style={styles.flightGlow} />
          <Animated.View style={flightStyle}>
            <BrandLogo size={132} iconSize={94} />
          </Animated.View>
          <Text style={styles.flightText}>PREPARANDO EL DESPEGUE</Text>
          <Text style={styles.flightBrand}>SkyNova</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flightOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  flightGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 120,
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 70,
    elevation: 20,
  },
  flightText: { ...typography.badge, color: colors.primary, marginTop: spacing.xxl, letterSpacing: 2 },
  flightBrand: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xs },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center', alignItems: 'center' },
  badge: {
    ...typography.badge,
    color: colors.primary,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.lg,
  },
  brandName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 38,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  forgotLink: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  demoHint: { ...typography.footer, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  registerPrompt: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  registerLink: { color: colors.primary, fontWeight: '700' },
  copyright: {
    ...typography.footer,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
