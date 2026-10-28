import { NewUserInput, User } from '../entities/User';

/**
 * Port the rest of the app codes against. `infrastructure/repositories`
 * provides the current in-memory implementation; a future
 * `ApiUserRepository` (real backend) just has to implement this same
 * contract — no other file in the app needs to change.
 */
export interface IUserRepository {
  create(input: NewUserInput): Promise<User>;
  authenticate(identifier: string, password: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
}
