import type { Product, ProductBrand, ProductCategory, ProductReview, ProductType } from '../entities/Product';

export type ProductSort = 'relevance' | 'price_asc' | 'price_desc' | 'best_selling' | 'best_rated' | 'newest';

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  categoryIds?: string[];
  brand?: string;
  productType?: ProductType;
  productTypes?: ProductType[];
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


export interface IProductRepository {
  syncCatalog(): Promise<boolean>;
  listCategories(): Promise<ProductCategory[]>;
  listBrands(): Promise<ProductBrand[]>;
  listHomeCollections(): Promise<HomeProductCollections>;
  searchSuggestions(query: string, limit?: number): Promise<Product[]>;
  listProducts(query?: ProductQuery): Promise<ProductPage>;
  listReviews(productId: string, onSyncError?: (error: unknown) => void): Promise<ProductReview[]>;
  saveReview(input: Omit<ProductReview, 'id' | 'createdAt' | 'reviewerName'> & { reviewerName: string }): Promise<ProductReview>;
}
