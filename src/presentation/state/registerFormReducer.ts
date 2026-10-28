import { Country } from '../../domain/entities/Country';

export interface RegisterFormValues {
  fullName: string;
  email: string;
  username: string;
  country: Country;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export type RegisterFormField = keyof RegisterFormValues;

export type RegisterFormErrors = Partial<Record<RegisterFormField, string>>;

export interface RegisterFormState {
  values: RegisterFormValues;
  errors: RegisterFormErrors;
  isSubmitting: boolean;
}

export type RegisterFormAction =
  | { type: 'SET_FIELD'; field: RegisterFormField; value: RegisterFormValues[RegisterFormField] }
  | { type: 'SET_ERRORS'; errors: RegisterFormErrors }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'RESET'; initialValues: RegisterFormValues };

export function buildInitialRegisterFormState(
  defaultCountry: Country
): RegisterFormState {
  return {
    values: {
      fullName: '',
      email: '',
      username: '',
      country: defaultCountry,
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false,
    },
    errors: {},
    isSubmitting: false,
  };
}


export function registerFormReducer(
  state: RegisterFormState,
  action: RegisterFormAction
): RegisterFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: undefined },
      };
    case 'SET_ERRORS':
      return { ...state, errors: { ...state.errors, ...action.errors } };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.isSubmitting };
    case 'RESET':
      return {
        values: action.initialValues,
        errors: {},
        isSubmitting: false,
      };
    default:
      return state;
  }
}
