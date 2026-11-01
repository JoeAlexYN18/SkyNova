import { User } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';

export class UserIdentifierNotFoundError extends Error {
  constructor() {
    super();
    this.name = 'UserIdentifierNotFoundError';
  }
}

export class InvalidPasswordError extends Error {
  constructor() {
    super();
    this.name = 'InvalidPasswordError';
  }
}


export async function authenticateUser(
  repository: IUserRepository,
  identifier: string,
  password: string
): Promise<User> {
  const result = await repository.authenticate(identifier.trim(), password);
  if (result.status === 'identifier_not_found') throw new UserIdentifierNotFoundError();
  if (result.status === 'invalid_password') throw new InvalidPasswordError();
  return result.user;
}
