import type { Product, ProductBrand, ProductCategory, ProductReview } from '../entities/Product';

export type ProductSort = 'relevance' | 'price_asc' | 'price_desc' | 'best_selling' | 'best_rated' | 'newest';

export interface ProductQuery {
  search?: string;
  categoryIds?: string[];
  brand?: string;
  isOffer?: boolean;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minFlightMinutes?: number;
  sortBy?: ProductSort;
  page?: number;
  pageSize?: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HomeProductCollections {
  featuredDrones: Product[];
  bestSellingAccessories: Product[];
}

export interface UserReviewItem extends ProductReview {
  productName: string;
  productImageUrl?: string;
  productPrice?: number;
  productCurrency?: string;
}


export interface IProductRepository {
  syncCatalog(): Promise<boolean>;
  listCategories(): Promise<ProductCategory[]>;
  listBrands(): Promise<ProductBrand[]>;
  listHomeCollections(): Promise<HomeProductCollections>;
  searchSuggestions(query: string, limit?: number): Promise<Product[]>;
  listProducts(query?: ProductQuery): Promise<ProductPage>;
  listReviews(productId: string, onSyncError?: (error: unknown) => void): Promise<ProductReview[]>;
  listUserReviews(userId: string, onSyncError?: (error: unknown) => void): Promise<UserReviewItem[]>;
  saveReview(input: Omit<ProductReview, 'id' | 'createdAt' | 'reviewerName'> & { reviewerName: string }): Promise<ProductReview>;
  deleteReview(productId: string, userId: string): Promise<'synced' | 'pending' | 'error'>;
  syncPendingReviews(onSyncError?: (error: unknown) => void): Promise<number>;
}
