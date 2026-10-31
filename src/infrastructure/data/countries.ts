import { Country } from '@domainentitiesCountry';


export const COUNTRIES Country[] = [
  { code 'MX', name 'México', dialCode '+52', flag '🇲🇽' },
  { code 'US', name 'Estados Unidos', dialCode '+1', flag '🇺🇸' },
  { code 'CA', name 'Canadá', dialCode '+1', flag '🇨🇦' },
  { code 'ES', name 'España', dialCode '+34', flag '🇪🇸' },
  { code 'AR', name 'Argentina', dialCode '+54', flag '🇦🇷' },
  { code 'BR', name 'Brasil', dialCode '+55', flag '🇧🇷' },
  { code 'CO', name 'Colombia', dialCode '+57', flag '🇨🇴' },
  { code 'CL', name 'Chile', dialCode '+56', flag '🇨🇱' },
  { code 'PE', name 'Perú', dialCode '+51', flag '🇵🇪' },
  { code 'EC', name 'Ecuador', dialCode '+593', flag '🇪🇨' },
  { code 'BO', name 'Bolivia', dialCode '+591', flag '🇧🇴' },
  { code 'PY', name 'Paraguay', dialCode '+595', flag '🇵🇾' },
  { code 'UY', name 'Uruguay', dialCode '+598', flag '🇺🇾' },
  { code 'VE', name 'Venezuela', dialCode '+58', flag '🇻🇪' },
  { code 'CR', name 'Costa Rica', dialCode '+506', flag '🇨🇷' },
  { code 'PA', name 'Panamá', dialCode '+507', flag '🇵🇦' },
  { code 'GT', name 'Guatemala', dialCode '+502', flag '🇬🇹' },
  { code 'HN', name 'Honduras', dialCode '+504', flag '🇭🇳' },
  { code 'SV', name 'El Salvador', dialCode '+503', flag '🇸🇻' },
  { code 'NI', name 'Nicaragua', dialCode '+505', flag '🇳🇮' },
  { code 'DO', name 'República Dominicana', dialCode '+1', flag '🇩🇴' },
  { code 'CU', name 'Cuba', dialCode '+53', flag '🇨🇺' },
  { code 'PR', name 'Puerto Rico', dialCode '+1', flag '🇵🇷' },
  { code 'GB', name 'Reino Unido', dialCode '+44', flag '🇬🇧' },
  { code 'FR', name 'Francia', dialCode '+33', flag '🇫🇷' },
  { code 'DE', name 'Alemania', dialCode '+49', flag '🇩🇪' },
  { code 'IT', name 'Italia', dialCode '+39', flag '🇮🇹' },
  { code 'PT', name 'Portugal', dialCode '+351', flag '🇵🇹' },
  { code 'NL', name 'Países Bajos', dialCode '+31', flag '🇳🇱' },
  { code 'BE', name 'Bélgica', dialCode '+32', flag '🇧🇪' },
  { code 'CH', name 'Suiza', dialCode '+41', flag '🇨🇭' },
  { code 'AT', name 'Austria', dialCode '+43', flag '🇦🇹' },
  { code 'SE', name 'Suecia', dialCode '+46', flag '🇸🇪' },
  { code 'NO', name 'Noruega', dialCode '+47', flag '🇳🇴' },
  { code 'DK', name 'Dinamarca', dialCode '+45', flag '🇩🇰' },
  { code 'FI', name 'Finlandia', dialCode '+358', flag '🇫🇮' },
  { code 'IE', name 'Irlanda', dialCode '+353', flag '🇮🇪' },
  { code 'PL', name 'Polonia', dialCode '+48', flag '🇵🇱' },
  { code 'RU', name 'Rusia', dialCode '+7', flag '🇷🇺' },
  { code 'CN', name 'China', dialCode '+86', flag '🇨🇳' },
  { code 'JP', name 'Japón', dialCode '+81', flag '🇯🇵' },
  { code 'KR', name 'Corea del Sur', dialCode '+82', flag '🇰🇷' },
  { code 'IN', name 'India', dialCode '+91', flag '🇮🇳' },
  { code 'AU', name 'Australia', dialCode '+61', flag '🇦🇺' },
  { code 'NZ', name 'Nueva Zelanda', dialCode '+64', flag '🇳🇿' },
  { code 'ZA', name 'Sudáfrica', dialCode '+27', flag '🇿🇦' },
  { code 'EG', name 'Egipto', dialCode '+20', flag '🇪🇬' },
  { code 'IL', name 'Israel', dialCode '+972', flag '🇮🇱' },
  { code 'AE', name 'Emiratos Árabes Unidos', dialCode '+971', flag '🇦🇪' },
  { code 'SA', name 'Arabia Saudita', dialCode '+966', flag '🇸🇦' },
  { code 'TR', name 'Turquía', dialCode '+90', flag '🇹🇷' },
  { code 'MA', name 'Marruecos', dialCode '+212', flag '🇲🇦' },
];

export const DEFAULT_COUNTRY Country =
  COUNTRIES.find((c) = c.code === 'US')  COUNTRIES[0];


export function fetchCountries() PromiseCountry[] {
  return new Promise((resolve) = {
    setTimeout(() = resolve(COUNTRIES), 500);
  });
}

