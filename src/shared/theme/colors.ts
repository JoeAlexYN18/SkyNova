/**
 * Central color palette for the SkyNova app.
 * Every screen/component reads from here instead of hardcoding hex values,
 * so the whole app stays visually consistent and easy to re-theme later.
 */
export const colors = {
  background: '#070B14',
  surface: '#121A2C',
  surfaceAlt: '#0C1322',
  inputBackground: '#0E1626',
  inputBackgroundFocused: '#101A2E',
  border: 'rgba(148, 163, 184, 0.14)',
  borderFocused: '#22D3EE',
  borderError: '#F87171',

  primary: '#22D3EE',
  primaryPressed: '#0FB8D4',
  onPrimary: '#04141A',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#5B6B86',
  placeholder: '#64748B',

  danger: '#F87171',
  warning: '#FBBF24',
  info: '#38BDF8',
  success: '#34D399',

  overlay: 'rgba(3, 7, 18, 0.72)',
  white: '#FFFFFF',
} as const;

export type AppColors = typeof colors;
