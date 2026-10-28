import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { InMemoryUserRepository } from './repositories/InMemoryUserRepository';
import { IProductRepository } from '@/domain/repositories/IProductRepository';
import { InMemoryProductRepository } from './repositories/InMemoryProductRepository';


export const userRepository: IUserRepository = new InMemoryUserRepository();
export const productRepository: IProductRepository = new InMemoryProductRepository();
