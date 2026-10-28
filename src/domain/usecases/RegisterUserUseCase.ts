import { NewUserInput, User } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super();
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class UsernameTakenError extends Error {
  constructor() {
    super();
    this.name = 'UsernameTakenError';
  }
}

/**
 * Business rule for registration, independent of React or any UI concern:
 * email and username must be unique before a user is created. Written
 * against the `IUserRepository` port, so it works unchanged whether the
 * repository is the in-memory one or a future real API.
 */
export async function registerUser(
  repository: IUserRepository,
  input: NewUserInput
): Promise<User> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedUsername = input.username.trim();

  const [existingByEmail, existingByUsername] = await Promise.all([
    repository.findByEmail(normalizedEmail),
    repository.findByUsername(normalizedUsername),
  ]);

  if (existingByEmail) {
    throw new EmailAlreadyRegisteredError();
  }
  if (existingByUsername) {
    throw new UsernameTakenError();
  }

  return repository.create({
    ...input,
    email: normalizedEmail,
    username: normalizedUsername,
    fullName: input.fullName.trim(),
  });
}
