import { useCallback, useReducer } from 'react';
import { Country } from '@/domain/entities/Country';
import {
  EmailAlreadyRegisteredError,
  UsernameTakenError,
} from '@/domain/usecases/RegisterUserUseCase';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import {
  buildInitialRegisterFormState,
  RegisterFormField,
  RegisterFormErrors,
  registerFormReducer,
  RegisterFormValues,
} from '@/presentation/state/registerFormReducer';
import { MESSAGES } from '@/shared/constants/messages';
import {
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhoneNumber,
  validateTerms,
  validateUsername,
} from '@/shared/validators/formValidators';


function validateAllFields(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {
    fullName: validateFullName(values.fullName),
    email: validateEmail(values.email),
    username: validateUsername(values.username),
    phoneNumber: validatePhoneNumber(values.phoneNumber, values.country.code),
    password: validatePassword(values.password),
    confirmPassword: validateConfirmPassword(values.password, values.confirmPassword),
    acceptedTerms: validateTerms(values.acceptedTerms),
  };

  (Object.keys(errors) as RegisterFormField[]).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });

  return errors;
}

export function useRegisterForm(defaultCountry: Country) {
  const [state, dispatch] = useReducer(
    registerFormReducer,
    defaultCountry,
    buildInitialRegisterFormState
  );
  const { register, logout } = useAuth();
  const { show } = useToast();

  const setField = useCallback(
    <F extends RegisterFormField>(field: F, value: RegisterFormValues[F]) => {
      dispatch({ type: 'SET_FIELD', field, value });
    },
    []
  );

  const submit = useCallback(async () => {
    const errors = validateAllFields(state.values);

    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      show(MESSAGES.FORM_HAS_ERRORS, 'error');
      return false;
    }

    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      await register({
        fullName: state.values.fullName,
        email: state.values.email,
        username: state.values.username,
        phone: {
          countryCode: state.values.country.code,
          dialCode: state.values.country.dialCode,
          number: state.values.phoneNumber.replace(/\D/g, ''),
        },
        password: state.values.password,
      });

      logout();
      show(MESSAGES.REGISTER_SUCCESS, 'success');
      dispatch({ type: 'RESET', initialValues: buildInitialRegisterFormState(defaultCountry).values });
      return true;
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        dispatch({ type: 'SET_ERRORS', errors: { email: MESSAGES.EMAIL_TAKEN } });
      } else if (error instanceof UsernameTakenError) {
        dispatch({ type: 'SET_ERRORS', errors: { username: MESSAGES.USERNAME_TAKEN } });
      } else {
        show(MESSAGES.REGISTER_GENERIC_ERROR, 'error');
      }
      return false;
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [state.values, register, logout, show, defaultCountry]);

  return { state, setField, submit };
}
