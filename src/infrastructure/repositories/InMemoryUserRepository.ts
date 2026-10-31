import { NewUserInput, User } from '@/domain/entities/User';
import { AuthenticationResult, IUserRepository } from '@/domain/repositories/IUserRepository';
import { generateId } from '@/shared/utils/generateId';
import { DEMO_CREDENTIALS } from '@/infrastructure/data/demoCredentials';

type StoredUser = User & { password: string };


export class InMemoryUserRepository implements IUserRepository {
  private users: StoredUser[] = [{
    id: 'demo-user',
    fullName: 'Alex Valdivia',
    email: DEMO_CREDENTIALS.email,
    username: DEMO_CREDENTIALS.username,
    phone: { countryCode: 'CO', dialCode: '+57', number: '3001234567' },
    createdAt: new Date().toISOString(),
    password: DEMO_CREDENTIALS.password,
  }];

  async create(input: NewUserInput): Promise<User> {
    const user: StoredUser = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return this.toPublicUser(user);
  }

  async authenticate(identifier: string, password: string): Promise<AuthenticationResult> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = this.users.find((candidate) =>
      candidate.email.toLowerCase() === normalizedIdentifier ||
      candidate.username.toLowerCase() === normalizedIdentifier
    );

    if (!user) return { status: 'identifier_not_found' };
    if (user.password !== password) return { status: 'invalid_password' };
    return { status: 'success', user: this.toPublicUser(user) };
  }

  async findByEmail(email: string): Promise<User | null> {
    const found =
      this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ??
      null;
    return found ? this.toPublicUser(found) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const found =
      this.users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      ) ?? null;
    return found ? this.toPublicUser(found) : null;
  }

  async resetPassword(identifier: string, newPassword: string): Promise<boolean> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = this.users.find((candidate) =>
      candidate.email.toLowerCase() === normalizedIdentifier ||
      candidate.username.toLowerCase() === normalizedIdentifier
    );
    if (!user) return false;
    user.password = newPassword;
    return true;
  }

  private toPublicUser(user: StoredUser): User {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      phone: { ...user.phone },
      createdAt: user.createdAt,
    };
  }
}

