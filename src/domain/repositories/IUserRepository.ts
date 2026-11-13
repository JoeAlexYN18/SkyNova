import { NewUserInput, UpdateUserProfileInput, User } from '../entities/User';

export type AuthenticationResult =
  | { status: 'success'; user: User }
  | { status: 'identifier_not_found' }
  | { status: 'invalid_password' }
  | { status: 'invalid_credentials' };

export interface IUserRepository {
  create(input: NewUserInput): Promise<User>;
  updateProfile(userId: string, input: UpdateUserProfileInput): Promise<User>;
  deleteAccount(userId: string, password: string): Promise<void>;
  authenticate(identifier: string, password: string): Promise<AuthenticationResult>;
  resetPassword(identifier: string, newPassword: string): Promise<boolean>;
  sendPasswordReset?(email: string): Promise<void>;
  signOut?(): Promise<void>;
  subscribe?(
    onChange: (user: User | null) => void,
    onError: (error: unknown) => void,
  ): () => void;
}
