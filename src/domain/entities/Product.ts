export type ProductType = 'drone' | 'accessory' | 'spare_part';

export interface ProductBrand {
  name: string;
  color: string;
}

/** Product fields are intentionally aligned with the PostgreSQL products table. */
export interface Product {
  id: string;
  categoryId: string;
  sku: string;
  name: string;
  description: string;
  productType: ProductType;
  brand: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  stockQuantity: number;
  isActive: boolean;
  isFeatured?: boolean;
  /** Controls whether the product appears in the Home collections. */
  isHomeVisible?: boolean;
  /** Max flight time from drone_specs; absent for accessories or unknown specs. */
  maxFlightMinutes?: number;
  /** Aggregated from product_reviews in the persistent repository. */
  ratingAverage?: number;
  ratingCount?: number;
  /** Aggregated from completed order_items in the persistent repository. */
  salesCount?: number;
  createdAt?: string;
  /** Primary image resolved from the normalized product_images table. */
  imageUrl?: string;
  imageAlt?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  productType: ProductType;
}
