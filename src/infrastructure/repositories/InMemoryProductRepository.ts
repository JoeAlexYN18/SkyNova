import type { IProductRepository, ProductQuery } from '@/domain/repositories/IProductRepository';
import type { Product, ProductCategory } from '@/domain/entities/Product';
import { mergeCatalogBrands } from '@/shared/data/brands';

const categories: ProductCategory[] = [
  { id: 'cat-drones-4k', name: 'Drones 4K', icon: 'video-outline', productType: 'drone' },
  { id: 'cat-drones-8k', name: 'Drones 8K', icon: 'video-outline', productType: 'drone' },
  { id: 'cat-fpv-carreras', name: 'FPV Carreras', icon: 'speedometer', productType: 'drone' },
  { id: 'cat-baterias', name: 'Baterías', icon: 'battery', productType: 'spare_part' },
  { id: 'cat-repuestos', name: 'Hélices', icon: 'fan', productType: 'spare_part' },
  { id: 'cat-drones-cine', name: 'Cinematográficos', icon: 'movie-open-outline', productType: 'drone' },
  { id: 'cat-filtros-nd', name: 'Filtros ND', icon: 'camera-iris', productType: 'accessory' },
  { id: 'cat-protecciones', name: 'Protecciones', icon: 'shield-outline', productType: 'accessory' },
];

const products: Product[] = [
  {
    id: 'prod-mini-5-pro', categoryId: 'cat-drones-4k', sku: 'SN-DJI-MINI5P', name: 'DJI Mini 5 Pro',
    isFeatured: true, maxFlightMinutes: 52, ratingAverage: 4.8, ratingCount: 130, salesCount: 245, createdAt: '2025-10-15T00:00:00Z',
    description: 'Cámara 1 pulgada · vídeo 4K/60 HDR · 52 min', productType: 'drone', brand: 'DJI',
    price: 739, currency: 'USD', stockQuantity: 5, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/89bd715bc6795bc6f966bf4d18130e36%40small.png',
    imageAlt: 'DJI Mini 5 Pro con control remoto',
  },
  {
    id: 'prod-air-3s', categoryId: 'cat-drones-4k', sku: 'SN-DJI-AIR3S', name: 'DJI Air 3S',
    isFeatured: true, maxFlightMinutes: 45, ratingAverage: 4.7, ratingCount: 98, salesCount: 200, createdAt: '2025-01-20T00:00:00Z',
    description: 'Doble cámara · 4K/60 HDR · 45 min', productType: 'drone', brand: 'DJI',
    price: 1029, currency: 'USD', stockQuantity: 4, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/0658c4092379bcb19997a3d759ee385a%40small.png',
    imageAlt: 'DJI Air 3S con control remoto',
  },
  {
    id: 'prod-mavic-4-pro', categoryId: 'cat-drones-cine', sku: 'SN-DJI-MAVIC4P', name: 'DJI Mavic 4 Pro',
    isFeatured: true, maxFlightMinutes: 51, ratingAverage: 4.9, ratingCount: 59, salesCount: 160, createdAt: '2025-05-18T00:00:00Z',
    description: 'Hasselblad 100 MP · vídeo 6K/60 HDR · 51 min', productType: 'drone', brand: 'DJI',
    price: 2049, currency: 'USD', stockQuantity: 2, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/8fc1361defb24de285e873dd9f508c46%40small.png',
    imageAlt: 'DJI Mavic 4 Pro con control DJI RC 2',
  },
  {
    id: 'prod-avata-360', categoryId: 'cat-drones-8k', sku: 'SN-DJI-AVATA360', name: 'DJI Avata 360',
    isFeatured: true, maxFlightMinutes: 23, ratingAverage: 4.6, ratingCount: 42, salesCount: 80, createdAt: '2026-02-10T00:00:00Z',
    description: 'Vídeo 360° 8K/60 HDR · vuelo inmersivo', productType: 'drone', brand: 'DJI',
    price: 399, currency: 'USD', stockQuantity: 6, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/fcf71fa0db49ef01390bebd5f4ea70f6%40small.png',
    imageAlt: 'DJI Avata 360 con protección de hélices',
  },
  {
    id: 'prod-avata-2', categoryId: 'cat-fpv-carreras', sku: 'SN-DJI-AVATA2', name: 'DJI Avata 2',
    isFeatured: true, maxFlightMinutes: 23, ratingAverage: 4.8, ratingCount: 90, salesCount: 195, createdAt: '2024-04-11T00:00:00Z',
    description: 'Dron FPV · 4K/60 HDR · modo acrobático', productType: 'drone', brand: 'DJI',
    price: 369, currency: 'USD', stockQuantity: 8, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/1e1ced1c9fc557b237068f683a067feb%40small.png',
    imageAlt: 'DJI Avata 2 FPV',
  },
  {
    id: 'prod-mavic-4-battery', categoryId: 'cat-baterias', sku: 'SN-DJI-M4-BAT', name: 'Batería Mavic 4 Pro',
    ratingAverage: 4.7, ratingCount: 22, salesCount: 75, createdAt: '2025-05-18T00:00:00Z',
    description: 'Batería inteligente · hasta 51 min', productType: 'spare_part', brand: 'DJI',
    price: 209, currency: 'USD', stockQuantity: 11, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/in_the_box/cover/e7693379b816321288072a397c51414b%40retina_small.png',
    imageAlt: 'Batería inteligente DJI Mavic 4 Pro',
  },
  {
    id: 'prod-air3s-battery', categoryId: 'cat-baterias', sku: 'SN-DJI-AIR3S-BAT', name: 'Batería inteligente Air 3S',
    ratingAverage: 4.5, ratingCount: 18, salesCount: 60, createdAt: '2024-10-15T00:00:00Z',
    description: 'Repuesto original · hasta 45 min', productType: 'spare_part', brand: 'DJI',
    price: 132, currency: 'USD', stockQuantity: 9, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/in_the_box/cover/1a1dd42dccc9f25bc533e2865e1f6d77%40retina_small.png',
    imageAlt: 'Batería inteligente DJI Air 3S',
  },
  {
    id: 'prod-mavic4-props', categoryId: 'cat-repuestos', sku: 'SN-DJI-M4-PROP', name: 'Hélices Mavic 4 Pro',
    ratingAverage: 4.4, ratingCount: 16, salesCount: 44, createdAt: '2025-05-18T00:00:00Z',
    description: 'Par de hélices originales · bajo ruido', productType: 'spare_part', brand: 'DJI',
    price: 16, currency: 'USD', stockQuantity: 15, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/in_the_box/cover/eb1300dd0adfc5b12e894f9fd7102742%40retina_small.png',
    imageAlt: 'Hélices de repuesto DJI Mavic 4 Pro',
  },
  {
    id: 'prod-air3s-nd', categoryId: 'cat-filtros-nd', sku: 'SN-DJI-AIR3S-ND', name: 'Filtros ND Air 3S (8/32/128)',
    ratingAverage: 4.6, ratingCount: 25, salesCount: 51, createdAt: '2024-10-15T00:00:00Z',
    description: 'Juego de filtros · control de exposición', productType: 'accessory', brand: 'DJI',
    price: 99, currency: 'USD', stockQuantity: 7, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/photo/image/43f27177fcd87ce27fca5daa7a06f0cd%40large.jpg',
    imageAlt: 'Set de filtros ND8, ND32 y ND128 DJI Air 3S',
  },
  {
    id: 'prod-mini5-battery', categoryId: 'cat-baterias', sku: 'SN-DJI-MINI5-BAT', name: 'Batería Mini 5 Pro',
    ratingAverage: 4.8, ratingCount: 27, salesCount: 67, createdAt: '2025-10-15T00:00:00Z',
    description: 'Batería inteligente original · hasta 36 min', productType: 'spare_part', brand: 'DJI',
    price: 79, currency: 'USD', stockQuantity: 13, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/in_the_box/cover/f93af593c890c367e0e0fa1b50d2f4a0%40retina_small.png',
    imageAlt: 'Batería inteligente DJI Mini 5 Pro',
  },
  {
    id: 'prod-avata360-props', categoryId: 'cat-repuestos', sku: 'SN-DJI-AVATA360-PROP', name: 'Hélices DJI Avata 360',
    ratingAverage: 4.3, ratingCount: 11, salesCount: 29, createdAt: '2026-02-10T00:00:00Z',
    description: 'Repuesto original · incluye tornillos', productType: 'spare_part', brand: 'DJI',
    price: 9, currency: 'USD', stockQuantity: 10, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/in_the_box/cover/295b45a7df814e0f8719ae1d93a25cb9%40retina_small.png',
    imageAlt: 'Par de hélices de repuesto DJI Avata 360',
  },
  {
    id: 'prod-avata2-fly-more-offer', categoryId: 'cat-fpv-carreras', sku: 'SN-DJI-AVATA2-FMC1',
    name: 'DJI Avata 2 Fly More Combo (1 batería)',
    compareAtPrice: 1087, maxFlightMinutes: 23, ratingAverage: 4.8, ratingCount: 90, salesCount: 105,
    createdAt: '2024-04-11T00:00:00Z', description: 'Combo FPV con gafas, control de movimiento y batería inteligente',
    productType: 'drone', brand: 'DJI', price: 849, currency: 'USD', stockQuantity: 3, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/1e1ced1c9fc557b237068f683a067feb%40small.png',
    imageAlt: 'DJI Avata 2 Fly More Combo con una batería',
  },
  {
    id: 'prod-avata2-three-battery-offer', categoryId: 'cat-fpv-carreras', sku: 'SN-DJI-AVATA2-FMC3',
    name: 'DJI Avata 2 Fly More Combo (3 baterías)',
    compareAtPrice: 1433, maxFlightMinutes: 23, ratingAverage: 4.8, ratingCount: 75, salesCount: 88,
    createdAt: '2024-04-11T00:00:00Z', description: 'Combo FPV con gafas, control de movimiento y tres baterías inteligentes',
    productType: 'drone', brand: 'DJI', price: 1019, currency: 'USD', stockQuantity: 2, isActive: true,
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/1e1ced1c9fc557b237068f683a067feb%40small.png',
    imageAlt: 'DJI Avata 2 Fly More Combo con tres baterías',
  },
  {
    id: 'prod-mini-4-pro-catalog', categoryId: 'cat-drones-4k', sku: 'SN-DJI-MINI4P',
    name: 'DJI Mini 4 Pro (DJI RC-N2)',
    description: 'Dron de menos de 249 g · vídeo 4K/60 HDR · detección omnidireccional',
    productType: 'drone', brand: 'DJI', price: 759, currency: 'USD', stockQuantity: 6, maxFlightMinutes: 34,
    isActive: true, isFeatured: false, isHomeVisible: false, createdAt: '2026-10-27T00:00:00Z',
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/in_the_box/cover/f255909c0783c37eb297b38f96b21729%40retina_small.png',
    imageAlt: 'DJI Mini 4 Pro con control RC-N2',
  },
  {
    id: 'prod-mini-4-pro-battery-catalog', categoryId: 'cat-baterias', sku: 'SN-DJI-MINI4P-BAT',
    name: 'Batería inteligente DJI Mini 4 Pro',
    description: 'Batería Li-ion de 2590 mAh · hasta 34 minutos de vuelo',
    productType: 'spare_part', brand: 'DJI', price: 99, currency: 'USD', stockQuantity: 12,
    isActive: true, isHomeVisible: false, createdAt: '2026-10-27T00:00:00Z',
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/photo/image/9c6383359a815f6a4ebb35d4686a192f%40large.jpg',
    imageAlt: 'Batería inteligente original DJI Mini 4 Pro',
  },
  {
    id: 'prod-dji-flip-catalog', categoryId: 'cat-drones-4k', sku: 'SN-DJI-FLIP-RCN3',
    name: 'DJI Flip (DJI RC-N3)',
    description: 'Sensor CMOS de 1/1.3 pulgadas · vídeo 4K/60 HDR · hasta 31 minutos',
    productType: 'drone', brand: 'DJI', price: 439, currency: 'USD', stockQuantity: 5, maxFlightMinutes: 31,
    isActive: true, isFeatured: false, isHomeVisible: false, createdAt: '2026-10-27T00:00:00Z',
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/201b8be78dcb262f6d1001e62826ff93%40small.png?format=webp',
    imageAlt: 'DJI Flip con control RC-N3 y protectores plegables',
  },
  {
    id: 'prod-mini-4-pro-propellers-catalog', categoryId: 'cat-repuestos', sku: 'SN-DJI-MINI4P-PROP',
    name: 'Hélices DJI Mini 4 Pro / Mini 3 Pro',
    description: 'Par de hélices de bajo ruido con tornillos incluidos',
    productType: 'spare_part', brand: 'DJI', price: 9, currency: 'USD', stockQuantity: 18,
    isActive: true, isHomeVisible: false, createdAt: '2026-10-27T00:00:00Z',
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/photo/image/59c374202a373db3c8ba10fc59841038%40large.jpg',
    imageAlt: 'Hélices de repuesto DJI Mini 4 Pro y Mini 3 Pro',
  },
  {
    id: 'prod-dji-neo-catalog', categoryId: 'cat-drones-4k', sku: 'SN-DJI-NEO-NORC',
    name: 'DJI Neo (sin control remoto)',
    description: 'Dron de 135 g · vídeo 4K/30 estabilizado · despegue desde la palma',
    productType: 'drone', brand: 'DJI', price: 169, currency: 'USD', stockQuantity: 9, maxFlightMinutes: 18,
    isActive: true, isFeatured: false, isHomeVisible: false, createdAt: '2026-10-27T00:00:00Z',
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/09f59fd6bcc743daa5b8eb82cb6e55e6%40small.png',
    imageAlt: 'DJI Neo compacto sin control remoto',
  },
  {
    id: 'prod-mini-4-pro-guard-catalog', categoryId: 'cat-protecciones', sku: 'SN-DJI-MINI4P-GUARD',
    name: 'Protector de hélices 360° DJI Mini 4 Pro',
    description: 'Protección ligera que rodea las hélices para vuelos en espacios estrechos',
    productType: 'accessory', brand: 'DJI', price: 29, currency: 'USD', stockQuantity: 10,
    isActive: true, isHomeVisible: false, createdAt: '2026-10-27T00:00:00Z',
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/photo/image/664c2a00ccabd8c8b1fa0ce5ab9f1150%40large.jpg',
    imageAlt: 'Protector de hélices 360 grados compatible con DJI Mini 4 Pro',
  },
  {
    id: 'prod-mini-3-catalog', categoryId: 'cat-drones-4k', sku: 'SN-DJI-MINI3-RCN1',
    name: 'DJI Mini 3 (DJI RC-N1)',
    description: 'Dron de menos de 249 g · vídeo 4K HDR · hasta 38 minutos de vuelo',
    productType: 'drone', brand: 'DJI', price: 419, currency: 'USD', stockQuantity: 7, maxFlightMinutes: 38,
    isActive: true, isFeatured: false, isHomeVisible: false, createdAt: '2026-10-27T00:00:00Z',
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/in_the_box/cover/8713fc0e55ee803566485bea9ad13e24%40retina_small.png',
    imageAlt: 'DJI Mini 3 con control remoto RC-N1',
  },
  {
    id: 'prod-mini-4-pro-nd-catalog', categoryId: 'cat-filtros-nd', sku: 'SN-DJI-MINI4P-ND',
    name: 'Set de filtros ND DJI Mini 4 Pro (ND16/64/256)',
    description: 'Tres filtros ND para luz intensa y fotografía de larga exposición',
    productType: 'accessory', brand: 'DJI', price: 55, currency: 'USD', stockQuantity: 8,
    isActive: true, isHomeVisible: false, createdAt: '2026-10-27T00:00:00Z',
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/photo/image/bf0139e325a16e9576910d7a1f1e6b1e%40large.jpg',
    imageAlt: 'Set de filtros ND16, ND64 y ND256 para DJI Mini 4 Pro',
  },
  {
    id: 'prod-mavic-3-pro-catalog', categoryId: 'cat-drones-cine', sku: 'SN-DJI-MAVIC3P-RC',
    name: 'DJI Mavic 3 Pro (DJI RC)',
    description: 'Cámara Hasselblad 4/3 y doble telecámara · vídeo hasta 5.1K · 43 minutos',
    productType: 'drone', brand: 'DJI', price: 2199, currency: 'USD', stockQuantity: 2, maxFlightMinutes: 43,
    isActive: true, isFeatured: false, isHomeVisible: false, createdAt: '2026-10-27T00:00:00Z',
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/9b1bb4e6929cb9c5d0ea22bf33eedffd%40small.png',
    imageAlt: 'DJI Mavic 3 Pro con control DJI RC',
  },
  {
    id: 'prod-mavic-3-battery-catalog', categoryId: 'cat-baterias', sku: 'SN-DJI-MAVIC3-BAT',
    name: 'Batería inteligente DJI Mavic 3 Series',
    description: 'Batería LiPo 4S de 5000 mAh · hasta 43 min con Mavic 3 Pro',
    productType: 'spare_part', brand: 'DJI', price: 159, currency: 'USD', stockQuantity: 5,
    isActive: true, isHomeVisible: false, createdAt: '2026-10-27T00:00:00Z',
    imageUrl: 'https://se-cdn.djiits.com/tpc/uploads/photo/image/807c2c2a7ab230073143832888617c6a%40large.jpg',
    imageAlt: 'Batería inteligente DJI Mavic 3 Series',
  },
];

export class InMemoryProductRepository implements IProductRepository {
  async listCategories() { return categories.map((category) => ({ ...category })); }

  async listBrands() {
    return mergeCatalogBrands(products.filter((product) => product.isActive).map((product) => product.brand));
  }

  async listHomeCollections() {
    const activeProducts = products.filter((product) => product.isActive);
    return {
      featuredDrones: activeProducts.filter((product) => product.productType === 'drone' && product.isHomeVisible !== false && !product.compareAtPrice).map(cloneProduct),
      bestSellingAccessories: activeProducts.filter((product) => product.productType !== 'drone' && product.isHomeVisible !== false && !product.compareAtPrice).map(cloneProduct),
    };
  }

  async listProducts(query: ProductQuery = {}) {
    const search = query.search?.trim().toLocaleLowerCase() ?? '';
    const brand = query.brand?.trim().toLocaleLowerCase();
    const matches = products.filter((product) => {
      if (!product.isActive) return false;
      if (query.categoryId && product.categoryId !== query.categoryId) return false;
      if (query.categoryIds?.length && !query.categoryIds.includes(product.categoryId)) return false;
      if (query.productType && product.productType !== query.productType) return false;
      if (query.productTypes && !query.productTypes.includes(product.productType)) return false;
      if (query.isOffer && !(product.compareAtPrice && product.compareAtPrice > product.price)) return false;
      if (query.isFeatured && !product.isFeatured) return false;
      if (query.minPrice !== undefined && product.price < query.minPrice) return false;
      if (query.maxPrice !== undefined && product.price > query.maxPrice) return false;
      if (query.minFlightMinutes !== undefined && (product.maxFlightMinutes === undefined || product.maxFlightMinutes < query.minFlightMinutes)) return false;
      if (brand && product.brand.trim().toLocaleLowerCase() !== brand) return false;
      if (!search) return true;

      return `${product.name} ${product.brand} ${product.sku} ${product.description}`
        .toLocaleLowerCase()
        .includes(search);
    });

    matches.sort((left, right) => compareProducts(left, right, query.sortBy ?? 'relevance'));

    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = Math.max(1, Math.floor(query.pageSize ?? 12));
    const start = (page - 1) * pageSize;

    return {
      items: matches.slice(start, start + pageSize).map(cloneProduct),
      total: matches.length,
      page,
      pageSize,
    };
  }
}

function cloneProduct(product: Product): Product {
  return { ...product };
}

function compareProducts(left: Product, right: Product, sortBy: NonNullable<ProductQuery['sortBy']>) {
  switch (sortBy) {
    case 'price_asc': return left.price - right.price;
    case 'price_desc': return right.price - left.price;
    case 'best_selling': return (right.salesCount ?? 0) - (left.salesCount ?? 0);
    case 'best_rated': return (right.ratingAverage ?? 0) - (left.ratingAverage ?? 0);
    case 'newest': return Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '');
    default:
      return Number(right.isFeatured ?? false) - Number(left.isFeatured ?? false)
        || (right.salesCount ?? 0) - (left.salesCount ?? 0);
  }
}
