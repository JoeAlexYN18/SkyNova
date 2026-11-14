import { useCallback, useState } from 'react';
import {
  InvalidCredentialsError,
  InvalidPasswordError,
  UserIdentifierNotFoundError,
} from '@/domain/usecases/AuthenticateUserUseCase';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import { MESSAGES } from '@/shared/constants/messages';
import { firebaseConfigured } from '@/infrastructure/data/firebaseServices';
import { isFirebaseNetworkError } from '@/infrastructure/data/firebaseDataSync';

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
    identifier: '',
    password: '',
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
    } else if (firebaseConfigured && !identifier.includes('@')) {
      errors.identifier = MESSAGES.INVALID_EMAIL;
    }

    if (Object.keys(errors).length > 0) {
      setState((current) => ({ ...current, errors }));
      return false;
    }

    setState((current) => ({ ...current, errors: {}, isSubmitting: true }));
    try {
      await login(identifier, state.password);
      return true;
    } catch (error) {
      if (error instanceof UserIdentifierNotFoundError) {
        setState((current) => ({
          ...current,
          errors: { identifier: MESSAGES.LOGIN_USER_NOT_FOUND },
        }));
        show(MESSAGES.LOGIN_USER_NOT_FOUND, 'error');
      } else if (error instanceof InvalidPasswordError) {
        setState((current) => ({
          ...current,
          errors: { password: MESSAGES.LOGIN_INVALID_PASSWORD },
        }));
        show(MESSAGES.LOGIN_INVALID_PASSWORD, 'error');
      } else if (error instanceof InvalidCredentialsError) {
        setState((current) => ({
          ...current,
          errors: { password: MESSAGES.LOGIN_INVALID_CREDENTIALS },
        }));
        show(MESSAGES.LOGIN_INVALID_CREDENTIALS, 'error');
      } else if (isFirebaseNetworkError(error)) {
        show(MESSAGES.NETWORK_ERROR, 'error');
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
