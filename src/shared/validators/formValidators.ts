import { isPossiblePhoneNumber, isSupportedCountry, type CountryCode } from 'libphonenumber-js';
import { MESSAGES } from '../constants/messages';


export const isRequired = (value: string): boolean => value.trim().length > 0;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

export function validateFullName(value: string): string | undefined {
  if (!isRequired(value)) return MESSAGES.REQUIRED;
  const length = Array.from(value.trim()).length;
  if (length < 2 || length > 100) return MESSAGES.INVALID_FULL_NAME;
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  if (!isRequired(value)) return MESSAGES.REQUIRED;
  const email = value.trim();
  if (email.length > 254 || !EMAIL_REGEX.test(email)) return MESSAGES.INVALID_EMAIL;
  return undefined;
}

export function validateUsername(value: string): string | undefined {
  if (!isRequired(value)) return MESSAGES.REQUIRED;
  if (!USERNAME_REGEX.test(value.trim())) return MESSAGES.INVALID_USERNAME;
  return undefined;
}

export function validatePhoneNumber(value: string, countryCode: string): string | undefined {
  if (!isRequired(value)) return MESSAGES.REQUIRED;
  if (!isSupportedCountry(countryCode)) return MESSAGES.INVALID_PHONE;
  if (!isPossiblePhoneNumber(value, countryCode as CountryCode)) return MESSAGES.INVALID_PHONE;
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value.length) return MESSAGES.REQUIRED;
  if (Array.from(value).length < 8) return MESSAGES.PASSWORD_TOO_SHORT;
  if (getPasswordStrength(value).score < 3) return MESSAGES.PASSWORD_TOO_WEAK;
  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string | undefined {
  if (!confirmPassword.length) return MESSAGES.REQUIRED;
  if (password !== confirmPassword) return MESSAGES.PASSWORD_MISMATCH;
  return undefined;
}

export function validateTerms(accepted: boolean): string | undefined {
  return accepted ? undefined : MESSAGES.TERMS_REQUIRED;
}

export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: PasswordStrengthLevel;
  colorKey: 'muted' | 'danger' | 'warning' | 'info' | 'success';
}


export function getPasswordStrength(value: string): PasswordStrength {
  if (!value.length) return { score: 0, colorKey: 'muted' };
  const variety = [/[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[^a-zA-Z0-9]/.test(value)].filter(Boolean).length;
  if (variety <= 1) return { score: 1, colorKey: 'danger' };
  if (variety === 2) return { score: 2, colorKey: 'warning' };
  if (variety === 3) return { score: 3, colorKey: 'info' };
  return { score: 4, colorKey: 'success' };
}

