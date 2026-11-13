
export const MESSAGES = {
  REQUIRED: 'Este campo es obligatorio.',
  INVALID_FULL_NAME: 'El nombre debe tener entre 2 y 100 caracteres.',
  INVALID_EMAIL: 'Ingresa un correo electrónico válido.',
  INVALID_PHONE: 'Ingresa un número posible para el país seleccionado.',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
  PASSWORD_TOO_WEAK: 'Usa al menos 3 tipos: mayúsculas, minúsculas, números o símbolos.',
  PASSWORD_MISMATCH: 'Las contraseñas no coinciden.',
  TERMS_REQUIRED:
    'Debes aceptar los Términos de servicio y la Política de privacidad para continuar.',
  EMAIL_TAKEN: 'Ya existe una cuenta registrada con este correo.',
  FORM_HAS_ERRORS: 'Revisa los campos marcados en rojo.',
  REGISTER_SUCCESS: '¡Cuenta creada con éxito! Bienvenido a SkyNova.',
  REGISTER_GENERIC_ERROR: 'No pudimos crear tu cuenta. Intenta nuevamente.',
  LOGIN_IDENTIFIER_REQUIRED: 'Ingresa tu correo electrónico.',
  LOGIN_USER_NOT_FOUND: 'No encontramos una cuenta con ese correo electrónico.',
  LOGIN_INVALID_PASSWORD: 'Contraseña inválida. Inténtalo otra vez.',
  LOGIN_INVALID_CREDENTIALS: 'Correo electrónico o contraseña incorrectos.',
  LOGIN_GENERIC_ERROR: 'No se pudo iniciar sesión. Revisa tu correo electrónico y contraseña.',
  INVALID_CARDHOLDER_NAME: 'Ingresa el nombre del titular como aparece en la tarjeta.',
  INVALID_CARD_NUMBER: 'Ingresa un número de tarjeta válido.',
  INVALID_CARD_EXPIRY: 'La fecha de vencimiento no es válida.',
  CARD_EXPIRED: 'Esta tarjeta está vencida.',
  INVALID_CARD_CVV: 'Ingresa el código de seguridad válido.',
};

export const PASSWORD_STRENGTH_LABEL: Record<number, string> = {
  0: '',
  1: 'Débil',
  2: 'Regular',
  3: 'Buena',
  4: 'Excelente',
};
