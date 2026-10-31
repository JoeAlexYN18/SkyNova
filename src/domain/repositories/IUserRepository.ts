import { NewUserInput, User } from '../entities/User';

export type AuthenticationResult =
  | { status: 'success'; user: User }
  | { status: 'identifier_not_found' }
  | { status: 'invalid_password' };

export interface IUserRepository {
  create(input: NewUserInput): Promise<User>;
  authenticate(identifier: string, password: string): Promise<AuthenticationResult>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  resetPassword(identifier: string, newPassword: string): Promise<boolean>;
}
