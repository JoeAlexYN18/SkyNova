// Improvement 3

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NewUserInput, UpdateUserProfileInput, User } from '@/domain/entities/User';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { authenticateUser } from '@/domain/usecases/AuthenticateUserUseCase';
import { registerUser } from '@/domain/usecases/RegisterUserUseCase';
import { userRepository } from '../container';
import { cacheUserProfile, deleteLocalAccountData } from '../data/sqliteDatabase';
import { useToast } from './ToastContext';

interface AuthContextValue {
  currentUser: User | null;
  isInitializing: boolean;
  register: (input: NewUserInput) => Promise<User>;
  updateProfile: (input: UpdateUserProfileInput) => Promise<User>;
  deleteAccount: (password: string) => Promise<void>;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (identifier: string, newPassword: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);


interface AuthProviderProps {
  children: React.ReactNode;
  repository?: IUserRepository;
}

export function AuthProvider({ children, repository = userRepository }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(Boolean(repository.subscribe));
  const { show } = useToast();

  useEffect(() => {
    if (!repository.subscribe) return;
    return repository.subscribe(
      (user) => {
        setCurrentUser(user);
        setIsInitializing(false);
      },
      (error) => {
        setIsInitializing(false);
        show(error instanceof Error ? error.message : 'No se pudo restaurar la sesión.', 'error');
      },
    );
  }, [repository, show]);

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

  const updateProfile = useCallback(async (input: UpdateUserProfileInput) => {
    if (!currentUser) throw new Error('Inicia sesión para actualizar tu perfil.');
    const user = await repository.updateProfile(currentUser.id, input);
    setCurrentUser(user);
    try {
      await cacheUserProfile(user);
    } catch (error) {
      const reason = error instanceof Error ? ` ${error.message}` : '';
      throw new Error(`El perfil se actualizó, pero no se pudo guardar la copia local.${reason}`);
    }
    return user;
  }, [currentUser, repository]);

  const deleteAccount = useCallback(async (password: string) => {
    if (!currentUser) throw new Error('Inicia sesión para eliminar tu cuenta.');
    const userId = currentUser.id;
    await repository.deleteAccount(userId, password);
    try {
      await deleteLocalAccountData(userId);
    } catch (error) {
      setCurrentUser(null);
      const reason = error instanceof Error ? ` ${error.message}` : '';
      throw new Error(`La cuenta se eliminó de Firebase, pero no se pudo borrar la copia local.${reason}`);
    }
    setCurrentUser(null);
  }, [currentUser, repository]);

  const logout = useCallback(async () => {
    await repository.signOut?.();
    setCurrentUser(null);
  }, [repository]);
  const resetPassword = useCallback(
    (identifier: string, newPassword: string) => repository.resetPassword(identifier, newPassword),
    [repository]
  );
  const sendPasswordReset = useCallback(async (email: string) => {
    if (!repository.sendPasswordReset) throw new Error('La recuperación por correo no está configurada.');
    await repository.sendPasswordReset(email);
  }, [repository]);

  const value = useMemo(
    () => ({ currentUser, isInitializing, register, updateProfile, deleteAccount, login, logout, resetPassword, sendPasswordReset }),
    [currentUser, isInitializing, register, updateProfile, deleteAccount, login, logout, resetPassword, sendPasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.');
  return ctx;
}
