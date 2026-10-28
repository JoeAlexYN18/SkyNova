import { NewUserInput, User } from '@/domain/entities/User';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
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

  async authenticate(identifier: string, password: string): Promise<User | null> {
    const normalizedIdentifier = identifier.trim();
    const user = normalizedIdentifier.includes('@')
      ? this.users.find(
          (candidate) => candidate.email.toLowerCase() === normalizedIdentifier.toLowerCase()
        )
      : this.users.find(
          (candidate) => candidate.username.toLowerCase() === normalizedIdentifier.toLowerCase()
        );

    return user?.password === password ? this.toPublicUser(user) : null;
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


