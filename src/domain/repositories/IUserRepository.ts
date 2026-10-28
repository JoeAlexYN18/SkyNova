import { NewUserInput, User } from '../entities/User';


export interface IUserRepository {
  create(input: NewUserInput): Promise<User>;
  authenticate(identifier: string, password: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
}
