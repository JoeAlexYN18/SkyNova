// Improvement 7

import { NewUserInput, UpdateUserProfileInput, User } from '@/domain/entities/User';
import { AuthenticationResult, IUserRepository } from '@/domain/repositories/IUserRepository';
import { generateId } from '@/shared/utils/generateId';
import { getCachedUserProfile } from '@/infrastructure/data/sqliteDatabase';
import { EmailAlreadyRegisteredError } from '@/domain/errors/UserErrors';

type StoredUser = User & { password: string };


// Repositorio del modo demo (sin Firebase). Las cuentas viven solo en memoria:
// al reiniciar la app se pierden, porque las contraseñas no se persisten
// (el caché SQLite solo guarda el perfil, sin credenciales).
export class InMemoryUserRepository implements IUserRepository {
  private users: StoredUser[] = [];

  async create(input: NewUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();

    if (this.users.some((user) => user.email.toLowerCase() === email)) {
      throw new EmailAlreadyRegisteredError();
    }

    const user: StoredUser = {
      ...input,
      fullName: input.fullName.trim(),
      email,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return this.toPublicUser(user);
  }

  async updateProfile(userId: string, input: UpdateUserProfileInput): Promise<User> {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (!user) throw new Error('No se encontró la cuenta que deseas actualizar.');
    await this.hydrateProfile(user);

    const email = input.email.trim().toLowerCase();
    if (this.users.some((candidate) => candidate.id !== userId && candidate.email.toLowerCase() === email)) {
      throw new EmailAlreadyRegisteredError();
    }

    const isCredentialChange = email !== user.email.toLowerCase() || Boolean(input.newPassword);
    if (isCredentialChange && (!input.currentPassword || input.currentPassword !== user.password)) {
      throw new Error('Confirma tu contraseña actual para cambiar el correo o la contraseña.');
    }

    user.fullName = input.fullName.trim();
    user.email = email;
    user.phone = { ...input.phone };
    if (input.newPassword) user.password = input.newPassword;
    return this.toPublicUser(user);
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const userIndex = this.users.findIndex((candidate) => candidate.id === userId);
    if (userIndex < 0) throw new Error('No se encontró la cuenta que deseas eliminar.');
    if (this.users[userIndex].password !== password) {
      throw new Error('La contraseña no es correcta.');
    }
    this.users.splice(userIndex, 1);
  }

  async authenticate(identifier: string, password: string): Promise<AuthenticationResult> {
    await this.hydrateProfiles();
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = this.users.find((candidate) => candidate.email.toLowerCase() === normalizedIdentifier);

    if (!user) return { status: 'identifier_not_found' };
    if (user.password !== password) return { status: 'invalid_password' };
    return { status: 'success', user: this.toPublicUser(user) };
  }

  async resetPassword(identifier: string, newPassword: string): Promise<boolean> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = this.users.find((candidate) => candidate.email.toLowerCase() === normalizedIdentifier);
    if (!user) return false;
    user.password = newPassword;
    return true;
  }

  private toPublicUser(user: StoredUser): User {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: { ...user.phone },
      createdAt: user.createdAt,
    };
  }

  private async hydrateProfile(user: StoredUser) {
    const cached = await getCachedUserProfile(user.id);
    if (!cached) return;
    user.fullName = cached.fullName;
    user.email = cached.email;
    user.phone = { ...cached.phone };
    user.createdAt = cached.createdAt;
  }

  private async hydrateProfiles() {
    await Promise.all(this.users.map((user) => this.hydrateProfile(user)));
  }
}
