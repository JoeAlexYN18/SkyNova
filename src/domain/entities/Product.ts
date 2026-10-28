export type ProductType = 'drone' | 'accessory' | 'spare_part';

export interface ProductBrand {
  name: string;
  color: string;
}

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

  isHomeVisible?: boolean;

  maxFlightMinutes?: number;

  ratingAverage?: number;
  ratingCount?: number;

  salesCount?: number;
  createdAt?: string;

  imageUrl?: string;
  imageAlt?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  productType: ProductType;
}
