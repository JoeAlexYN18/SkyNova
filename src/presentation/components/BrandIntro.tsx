import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Easing, Pressable, StyleSheet, View } from 'react-native';
import { BrandLogo } from '@/presentation/components/BrandLogo';
import { colors, radius, spacing } from '@/shared/theme';

const WORDMARK = 'SKYNOVA';
const TAGLINE = 'DRONES · ACCESORIOS · REPUESTOS';
const INTRO_DURATION_MS = 1500;
const REDUCED_DURATION_MS = 400;
const EXIT_BUFFER_MS = 150;

export function BrandIntro({ onDone }: { onDone: () => void }) {
  const [backdrop] = useState(() => new Animated.Value(0));
  const [logoScale] = useState(() => new Animated.Value(0.82));
  const [logoGlow] = useState(() => new Animated.Value(0));
  const [tagline] = useState(() => new Animated.Value(0));
  const [letterAnims] = useState(() => WORDMARK.split('').map(() => new Animated.Value(0)));

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onDone();
      return true;
    });
    return () => subscription.remove();
  }, [onDone]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const running: Animated.CompositeAnimation[] = [];

    const play = (reduceMotion: boolean) => {
      if (!active) return;
      const duration = reduceMotion ? REDUCED_DURATION_MS : INTRO_DURATION_MS;
      const easing = Easing.out(Easing.cubic);

      const entrance = Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration, easing, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.timing(tagline, {
          toValue: 1,
          duration: duration * 0.55,
          delay: duration * 0.42,
          easing,
          useNativeDriver: true,
        }),
        ...letterAnims.map((anim, index) => Animated.timing(anim, {
          toValue: 1,
          duration: duration * 0.5,
          delay: reduceMotion ? 0 : duration * 0.3 + index * 55,
          easing,
          useNativeDriver: true,
        })),
      ]);
      running.push(entrance);
      entrance.start();

      if (!reduceMotion) {
        const glowLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(logoGlow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(logoGlow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ]),
          { iterations: 2 },
        );
        running.push(glowLoop);
        glowLoop.start();
      }

      timer = setTimeout(onDone, duration + EXIT_BUFFER_MS);
    };

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => play(enabled))
      .catch(() => play(false));

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      running.forEach((animation) => animation.stop());
    };
  }, [backdrop, logoScale, logoGlow, tagline, letterAnims, onDone]);

  return (
    <Pressable style={styles.container} onPress={onDone} accessibilityRole="button" accessibilityLabel="Continuar">
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]} pointerEvents="none" />
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoScale,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: logoGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] }),
              transform: [{ scale: logoGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
            },
          ]}
          pointerEvents="none"
        />
        <BrandLogo size={92} iconSize={58} />
      </Animated.View>
      <View style={styles.wordmark}>
        {WORDMARK.split('').map((letter, index) => (
          <Animated.Text
            key={`${letter}-${index}`}
            style={[
              styles.wordmarkLetter,
              {
                opacity: letterAnims[index],
                transform: [
                  { translateY: letterAnims[index].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                ],
              },
            ]}
          >
            {letter}
          </Animated.Text>
        ))}
      </View>
      <Animated.Text style={[styles.tagline, { opacity: tagline }]}>{TAGLINE}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  glow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },
  wordmark: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  wordmarkLetter: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 6,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
  },
});
