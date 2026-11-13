// Improvement 2

import { NewUserInput, User } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';

export async function registerUser(
  repository: IUserRepository,
  input: NewUserInput
): Promise<User> {
  const normalizedEmail = input.email.trim().toLowerCase();

  return repository.create({
    ...input,
    email: normalizedEmail,
    fullName: input.fullName.trim(),
  });
}
