import { User } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';

export class InvalidCredentialsError extends Error {
  constructor() {
    super();
    this.name = 'InvalidCredentialsError';
  }
}


export async function authenticateUser(
  repository: IUserRepository,
  identifier: string,
  password: string
): Promise<User> {
  const user = await repository.authenticate(identifier.trim(), password);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  return user;
}
