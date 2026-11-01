// Improvement 2

import { NewUserInput, User } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';
import { EmailAlreadyRegisteredError, UsernameTakenError } from '../errors/UserErrors';

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

