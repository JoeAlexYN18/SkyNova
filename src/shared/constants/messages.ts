
export const MESSAGES = {
  REQUIRED: 'Este campo es obligatorio.',
  INVALID_FULL_NAME: 'El nombre debe tener entre 2 y 100 caracteres.',
  INVALID_EMAIL: 'Ingresa un correo electrónico válido.',
  INVALID_USERNAME: 'Usa 3 a 20 caracteres: letras, números, "-" o "_".',
  INVALID_PHONE: 'Ingresa un número posible para el país seleccionado.',
  PASSWORD_TOO_SHORT: 'La contrasena debe tener al menos 8 caracteres.',
  PASSWORD_TOO_WEAK: 'Usa al menos 3 tipos: mayusculas, minusculas, numeros o simbolos.',
  PASSWORD_MISMATCH: 'Las contraseñas no coinciden.',
  TERMS_REQUIRED:
    'Debes aceptar los Términos de servicio y la Política de privacidad para continuar.',
  EMAIL_TAKEN: 'Ya existe una cuenta registrada con este correo.',
  USERNAME_TAKEN: 'Este usuario ya está en uso, prueba con otro.',
  FORM_HAS_ERRORS: 'Revisa los campos marcados en rojo.',
  REGISTER_SUCCESS: '¡Cuenta creada con éxito! Bienvenido a SkyNova.',
  REGISTER_GENERIC_ERROR: 'No pudimos crear tu cuenta. Intenta nuevamente.',
  LOGIN_IDENTIFIER_REQUIRED: 'Ingresa tu correo o usuario.',
  LOGIN_USER_NOT_FOUND: 'Este correo electrónico o usuario no existe.',
  LOGIN_PASSWORD_REQUIRED: 'Ingresa tu contraseña.',
  LOGIN_INVALID_PASSWORD: 'Contraseña inválida. Inténtalo otra vez.',
  LOGIN_INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos.',
  LOGIN_GENERIC_ERROR: 'No se pudo iniciar sesión. Correo electrónico o usuario o contraseña inválidos.',
  PASSWORD_RECOVERY_UNAVAILABLE: 'La recuperación de contraseña estará disponible próximamente.',
};

export const PASSWORD_STRENGTH_LABEL: Record<number, string> = {
  0: '',
  1: 'Débil',
  2: 'Regular',
  3: 'Buena',
  4: 'Excelente',
};
