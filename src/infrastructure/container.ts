import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { InMemoryUserRepository } from './repositories/InMemoryUserRepository';
import { FirebaseUserRepository } from './repositories/FirebaseUserRepository';
import { firebaseConfigured } from './data/firebaseServices';
import { IProductRepository } from '@/domain/repositories/IProductRepository';
import { SqliteProductRepository } from './repositories/SqliteProductRepository';
import type { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { SqliteOrderRepository } from './repositories/SqliteOrderRepository';


export const userRepository: IUserRepository = firebaseConfigured
  ? new FirebaseUserRepository()
  : new InMemoryUserRepository();
export const productRepository: IProductRepository = new SqliteProductRepository();
export const orderRepository: IOrderRepository = new SqliteOrderRepository();
