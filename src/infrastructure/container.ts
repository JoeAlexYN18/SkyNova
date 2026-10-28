import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { InMemoryUserRepository } from './repositories/InMemoryUserRepository';
import { IProductRepository } from '@/domain/repositories/IProductRepository';
import { InMemoryProductRepository } from './repositories/InMemoryProductRepository';

/** Swap this binding for an API-backed implementation when persistence is added. */
export const userRepository: IUserRepository = new InMemoryUserRepository();
export const productRepository: IProductRepository = new InMemoryProductRepository();
