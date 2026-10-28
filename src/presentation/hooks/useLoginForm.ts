import { useCallback, useState } from 'react';
import { InvalidCredentialsError } from '@/domain/usecases/AuthenticateUserUseCase';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import { MESSAGES } from '@/shared/constants/messages';
import { validateEmail, validateUsername } from '@/shared/validators/formValidators';
import { DEMO_CREDENTIALS } from '@/infrastructure/data/demoCredentials';

type LoginField = 'identifier' | 'password';
type LoginErrors = Partial<Record<LoginField, string>>;

interface LoginFormState {
  identifier: string;
  password: string;
  errors: LoginErrors;
  isSubmitting: boolean;
}

export function useLoginForm() {
  const [state, setState] = useState<LoginFormState>({
    identifier: DEMO_CREDENTIALS.username,
    password: DEMO_CREDENTIALS.password,
    errors: {},
    isSubmitting: false,
  });
  const { login } = useAuth();
  const { show } = useToast();

  const setIdentifier = useCallback((identifier: string) => {
    setState((current) => ({
      ...current,
      identifier,
      errors: { ...current.errors, identifier: undefined, password: undefined },
    }));
  }, []);

  const setPassword = useCallback((password: string) => {
    setState((current) => ({
      ...current,
      password,
      errors: { ...current.errors, password: undefined },
    }));
  }, []);

  const submit = useCallback(async () => {
    const errors: LoginErrors = {};
    const identifier = state.identifier.trim();
    if (!identifier) {
      errors.identifier = MESSAGES.LOGIN_IDENTIFIER_REQUIRED;
    } else {
      errors.identifier = identifier.includes('@')
        ? validateEmail(identifier)
        : validateUsername(identifier);
    }
    if (!state.password.length) errors.password = MESSAGES.LOGIN_PASSWORD_REQUIRED;

    if (Object.keys(errors).length > 0) {
      setState((current) => ({ ...current, errors }));
      return false;
    }

    setState((current) => ({ ...current, errors: {}, isSubmitting: true }));
    try {
      await login(identifier, state.password);
      show(MESSAGES.LOGIN_SUCCESS, 'success');
      return true;
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        setState((current) => ({
          ...current,
          errors: { password: MESSAGES.LOGIN_INVALID_CREDENTIALS },
        }));
      } else {
        show(MESSAGES.LOGIN_GENERIC_ERROR, 'error');
      }
      return false;
    } finally {
      setState((current) => ({ ...current, isSubmitting: false }));
    }
  }, [state.identifier, state.password, login, show]);

  return { state, setIdentifier, setPassword, submit };
}
