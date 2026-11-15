// Improvement 13

import {
  isPossiblePhoneNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { MESSAGES } from '../constants/messages';
import type { CardBrand } from '@/domain/entities/Order';


const isRequired = (value: string): boolean => value.trim().length > 0;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

export function validatePhoneNumber(value: string, countryCode: string): string | undefined {
  if (!isRequired(value)) return MESSAGES.REQUIRED;
  if (!isSupportedCountry(countryCode)) return MESSAGES.INVALID_PHONE;
  const country = countryCode as CountryCode;
  const parsedPhone = parsePhoneNumberFromString(value.trim(), country);
  if (
    !parsedPhone
    || parsedPhone.country !== country
    || !isPossiblePhoneNumber(value, country)
  ) return MESSAGES.INVALID_PHONE;
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

type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

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

export function validateCardholderName(value: string): string | undefined {
  if (!isRequired(value)) return MESSAGES.REQUIRED;
  const name = value.trim();
  if (name.length < 2 || name.length > 100 || !/^[\p{L}][\p{L} .'’-]*$/u.test(name)) {
    return MESSAGES.INVALID_CARDHOLDER_NAME;
  }
  return undefined;
}

export function cardDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function isLuhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = digits.charCodeAt(index) - 48;
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

export function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^6(011|5)/.test(digits)) return 'discover';
  return 'other';
}

export function validateCardNumber(value: string): string | undefined {
  const digits = cardDigits(value);
  if (!digits.length) return MESSAGES.REQUIRED;
  return isLuhnValid(digits) ? undefined : MESSAGES.INVALID_CARD_NUMBER;
}

export function validateCardExpiry(value: string): string | undefined {
  const digits = cardDigits(value);
  if (!digits.length) return MESSAGES.REQUIRED;
  const match = /^(\d{2})(\d{2})$/.exec(digits);
  if (!match) return MESSAGES.INVALID_CARD_EXPIRY;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return MESSAGES.INVALID_CARD_EXPIRY;
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    return MESSAGES.CARD_EXPIRED;
  }
  return undefined;
}

export function validateCardCvv(value: string, brand: CardBrand): string | undefined {
  const digits = cardDigits(value);
  if (!digits.length) return MESSAGES.REQUIRED;
  const expectedLength = brand === 'amex' ? 4 : 3;
  return digits.length === expectedLength ? undefined : MESSAGES.INVALID_CARD_CVV;
}
