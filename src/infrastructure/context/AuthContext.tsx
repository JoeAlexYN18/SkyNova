import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { NewUserInput, User } from '@/domain/entities/User';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { authenticateUser } from '@/domain/usecases/AuthenticateUserUseCase';
import { registerUser } from '@/domain/usecases/RegisterUserUseCase';
import { userRepository } from '../container';

interface AuthContextValue {
  currentUser: User | null;
  register: (input: NewUserInput) => Promise<User>;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => void;
  resetPassword: (identifier: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);


interface AuthProviderProps {
  children: React.ReactNode;
  repository?: IUserRepository;
}

export function AuthProvider({ children, repository = userRepository }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const register = useCallback(async (input: NewUserInput) => {
    const user = await registerUser(repository, input);
    setCurrentUser(user);
    return user;
  }, [repository]);

  const login = useCallback(async (identifier: string, password: string) => {
    const user = await authenticateUser(repository, identifier, password);
    setCurrentUser(user);
    return user;
  }, [repository]);

  const logout = useCallback(() => setCurrentUser(null), []);
  const resetPassword = useCallback(
    (identifier: string, newPassword: string) => repository.resetPassword(identifier, newPassword),
    [repository]
  );

  const value = useMemo(
    () => ({ currentUser, register, login, logout, resetPassword }),
    [currentUser, register, login, logout, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.');
  return ctx;
}
