import type * as SQLite from 'expo-sqlite';
import type { IProductRepository, ProductQuery, UserReviewItem } from '@/domain/repositories/IProductRepository';
import type { Product, ProductCategory, ProductImage, ProductReview } from '@/domain/entities/Product';
import { mergeCatalogBrands } from '@/shared/data/brands';
import { getDatabase, withDatabaseTransaction } from '@/infrastructure/data/sqliteDatabase';
import { generateId } from '@/shared/utils/generateId';
import {
  deleteReviewFromFirebase,
  getAllProductReviewsFromFirebase,
  getCatalogFromFirebase,
  getProductReviewsFromFirebase,
  getUserReviewsFromFirebase,
  hasNetworkConnection,
  isAuthSessionError,
  syncReviewToFirebase,
} from '@/infrastructure/data/firebaseDataSync';
import { getCatalogFromRest, restApiConfigured } from '@/infrastructure/data/restApiClient';

const categories: ProductCategory[] = [
  { id: 'cat-drones-4k', name: 'Drones 4K', icon: 'video-outline', productType: 'drone' },
  { id: 'cat-drones-8k', name: 'Drones 8K', icon: 'video-outline', productType: 'drone' },
  { id: 'cat-fpv-carreras', name: 'FPV Carreras', icon: 'speedometer', productType: 'drone' },
  { id: 'cat-baterias', name: 'Baterías', icon: 'battery', productType: 'spare_part' },
  { id: 'cat-filtros-nd', name: 'Filtros ND', icon: 'camera-iris', productType: 'accessory' },
  { id: 'cat-protecciones', name: 'Protecciones', icon: 'shield-outline', productType: 'accessory' },
  { id: 'cat-repuestos', name: 'Hélices', icon: 'fan', productType: 'spare_part' },
  { id: 'cat-brazos', name: 'Brazos', icon: 'wrench-outline', productType: 'spare_part' },
  { id: 'cat-motores', name: 'Motores', icon: 'engine-outline', productType: 'spare_part' },
  { id: 'cat-drones-cine', name: 'Cinematográficos', icon: 'movie-open-outline', productType: 'drone' },
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
    id: 'prod-autel-evo-lite-plus', categoryId: 'cat-drones-4k', sku: 'SN-AUTEL-EVOLITEP',
    name: 'Autel EVO Lite+',
    description: 'Dron plegable para fotografía y vídeo aéreo · cámara de alta resolución',
    productType: 'drone', brand: 'Autel Robotics', price: 1149, currency: 'USD', stockQuantity: 4, maxFlightMinutes: 40,
    ratingAverage: 4.7, ratingCount: 34, salesCount: 92,
    isActive: true, isFeatured: true, isHomeVisible: true, createdAt: '2026-10-28T00:00:00Z',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1538/0803/files/1_2a74d08d-0c93-4f63-816e-b1a7352066ce.png?v=1760996980',
    imageAlt: 'Dron Autel EVO Lite+ en color naranja',
  },
  {
    id: 'prod-skydio-x10', categoryId: 'cat-drones-4k', sku: 'SN-SKYDIO-X10',
    name: 'Skydio X10',
    description: 'Plataforma aérea profesional para inspección, mapeo y operaciones de campo',
    productType: 'drone', brand: 'Skydio', price: 12499, currency: 'USD', stockQuantity: 2, maxFlightMinutes: 40,
    ratingAverage: 4.8, ratingCount: 16, salesCount: 38,
    isActive: true, isFeatured: false, isHomeVisible: false, createdAt: '2026-10-28T00:00:00Z',
    imageUrl: 'https://cdn.sanity.io/images/mgxz50fq/production-v3-red/22114158c43e8d8b005a075297ffaa0a6a379954-2930x1120.png?w=3000&fit=max&auto=format',
    imageAlt: 'Dron profesional Skydio X10',
  },
  {
    id: 'prod-betafpv-cetus-x', categoryId: 'cat-fpv-carreras', sku: 'SN-BETAFPV-CETUSX',
    name: 'BETAFPV Cetus X FPV Kit',
    description: 'Kit FPV para practicar vuelo inmersivo y maniobras en interiores',
    productType: 'drone', brand: 'BetaFPV', price: 299, currency: 'USD', stockQuantity: 7, maxFlightMinutes: 5,
    ratingAverage: 4.6, ratingCount: 29, salesCount: 76,
    isActive: true, isFeatured: true, isHomeVisible: true, createdAt: '2026-10-28T00:00:00Z',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1778/6615/products/74b96dbb2d19db9758ba306fc55ad040_54f7f44f-2c02-4260-9cd7-f73550d6f448.jpg?v=1664359398',
    imageAlt: 'Kit BETAFPV Cetus X con dron FPV, gafas y control remoto',
  },
  {
    id: 'prod-geprc-cinebot30', categoryId: 'cat-fpv-carreras', sku: 'SN-GEPRC-CINEBOT30',
    name: 'GEPRC Cinebot30 HD O3',
    description: 'Dron FPV cinewhoop con protectores de hélice para tomas cinematográficas',
    productType: 'drone', brand: 'GEPRC', price: 629, currency: 'USD', stockQuantity: 3, maxFlightMinutes: 6,
    ratingAverage: 4.7, ratingCount: 21, salesCount: 57,
    isActive: true, isFeatured: false, isHomeVisible: false, createdAt: '2026-10-28T00:00:00Z',
    imageUrl: 'https://geprc.com/wp-content/uploads/2022/11/Cinebot30-HD-O3-FPV-4.jpg',
    imageAlt: 'Dron FPV GEPRC Cinebot30 HD O3',
  },
  {
    id: 'prod-parrot-anafi-ai', categoryId: 'cat-drones-cine', sku: 'SN-PARROT-ANAFIAI',
    name: 'Parrot ANAFI Ai',
    description: 'Dron profesional con conectividad 4G para inspección y captura aérea',
    productType: 'drone', brand: 'Parrot', price: 3999, currency: 'USD', stockQuantity: 2, maxFlightMinutes: 32,
    ratingAverage: 4.8, ratingCount: 14, salesCount: 32,
    isActive: true, isFeatured: true, isHomeVisible: true, createdAt: '2026-10-28T00:00:00Z',
    imageUrl: 'https://www.parrot.com/assets/s3fs-public/styles/mdlossless/public/2022-06/Anafi-Ai-4G-Connected.jpg',
    imageAlt: 'Dron profesional Parrot ANAFI Ai',
  },
  {
    id: 'prod-holystone-hs360g', categoryId: 'cat-drones-4k', sku: 'SN-HOLYSTONE-HS360G',
    name: 'Holy Stone HS360G',
    description: 'Dron de 249 g con cámara 4K y estabilizador mecánico de 3 ejes',
    productType: 'drone', brand: 'Holy Stone', price: 299, currency: 'USD', stockQuantity: 8, maxFlightMinutes: 32,
    ratingAverage: 4.5, ratingCount: 41, salesCount: 68,
    isActive: true, isFeatured: false, isHomeVisible: false, createdAt: '2026-10-28T00:00:00Z',
    imageUrl: 'https://static.holystone.com/Uploads/Editor/2026-08-24/6a8b99151f040.webp',
    imageAlt: 'Dron Holy Stone HS360G con cámara 4K y gimbal de 3 ejes',
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

const categoryIcons: Record<string, string> = Object.fromEntries(categories.map(({ id, icon }) => [id, icon]));
let catalogSeedPromise: Promise<void> | undefined;
let catalogSyncPromise: Promise<boolean> | undefined;
let catalogCachePromise: Promise<{ categories: ProductCategory[]; products: Product[] }> | undefined;

export function invalidateProductCatalogCache() {
  catalogCachePromise = undefined;
}

export class SqliteProductRepository implements IProductRepository {
  async syncCatalog() {
    if (!catalogSyncPromise) {
      catalogSyncPromise = this.importRemoteCatalog().catch((error: unknown) => {
        catalogSyncPromise = undefined;
        throw error;
      });
    }
    return catalogSyncPromise;
  }

  async listCategories() {
    return (await this.loadCatalog()).categories;
  }

  async listBrands() {
    const { products: catalogProducts } = await this.loadCatalog();
    return mergeCatalogBrands(catalogProducts.filter((product) => product.isActive).map((product) => product.brand));
  }

  async listHomeCollections() {
    const { products: catalogProducts } = await this.loadCatalog();
    const activeProducts = catalogProducts.filter((product) => product.isActive);
    return {
      featuredDrones: activeProducts.filter((product) => product.productType === 'drone' && product.isHomeVisible !== false && !product.compareAtPrice).map(cloneProduct),
      bestSellingAccessories: activeProducts.filter((product) => product.productType !== 'drone' && product.isHomeVisible !== false && !product.compareAtPrice).map(cloneProduct),
    };
  }

  async searchSuggestions(query: string, limit = 5) {
    const { products: catalogProducts, categories: catalogCategories } = await this.loadCatalog();
    const normalizedQuery = normalizeSearchText(query);
    const terms = getSearchTerms(normalizedQuery);
    if (terms.length === 0) return [];

    const searchableProducts = catalogProducts.map((product) => ({
      product,
      name: normalizeSearchText(product.name),
      brand: normalizeSearchText(product.brand),
      sku: normalizeSearchText(product.sku),
      text: buildSearchText(product, new Map(catalogCategories.map((category) => [category.id, category]))),
    }));
    return searchableProducts
      .filter(({ product, text }) => product.isActive && terms.every((term) => text.includes(term)))
      .sort((left, right) => scoreSearchMatch(right, normalizedQuery) - scoreSearchMatch(left, normalizedQuery))
      .slice(0, Math.max(0, limit))
      .map(({ product }) => cloneProduct(product));
  }

  async listProducts(query: ProductQuery = {}) {
    const { products: catalogProducts, categories: catalogCategories } = await this.loadCatalog();
    const categoriesById = new Map(catalogCategories.map((category) => [category.id, category]));
    const searchTerms = getSearchTerms(query.search ?? '');
    const searchableProducts = catalogProducts.map((product) => ({
      product,
      text: searchTerms.length ? buildSearchText(product, categoriesById) : '',
    }));
    const brand = query.brand?.trim().toLocaleLowerCase();
    const matches = searchableProducts.filter(({ product, text }) => {
      if (!product.isActive) return false;
      if (query.categoryIds?.length && !query.categoryIds.includes(product.categoryId)) return false;
      if (query.isOffer && !(product.compareAtPrice && product.compareAtPrice > product.price)) return false;
      if (query.isFeatured && !product.isFeatured) return false;
      if (query.minPrice !== undefined && product.price < query.minPrice) return false;
      if (query.maxPrice !== undefined && product.price > query.maxPrice) return false;
      if (query.minFlightMinutes !== undefined && (product.maxFlightMinutes === undefined || product.maxFlightMinutes < query.minFlightMinutes)) return false;
      if (brand && product.brand.trim().toLocaleLowerCase() !== brand) return false;
      return searchTerms.every((term) => text.includes(term));
    });

    const sortBy = query.sortBy ?? 'relevance';
    const sortedMatches = sortBy === 'relevance'
      ? interleaveRelevantProducts(matches.map(({ product }) => product))
      : matches.map(({ product }) => product).sort((left, right) => compareProducts(left, right, sortBy));

    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = Math.max(1, Math.floor(query.pageSize ?? 12));
    const start = (page - 1) * pageSize;

    return {
      items: sortedMatches.slice(start, start + pageSize).map(cloneProduct),
      total: matches.length,
      page,
      pageSize,
    };
  }

  async listReviews(productId: string, onSyncError?: (error: unknown) => void): Promise<ProductReview[]> {
    const database = await getDatabase();
    let cloudReviews: ProductReview[] = [];
    try {
      cloudReviews = await getProductReviewsFromFirebase(productId);
    } catch (error) {
      onSyncError?.(error);
    }
    await this.cacheCloudReviews(database, cloudReviews);
    let pushedReviews = 0;
    if (await hasNetworkConnection()) {
      pushedReviews = await this.pushPendingReviews(database, productId, onSyncError);
    }
    if (cloudReviews.length > 0 || pushedReviews > 0) invalidateProductCatalogCache();
    const rows = await database.getAllAsync<ReviewRow>(
      `SELECT r.id, r.product_id, r.user_id, u.full_name, r.rating, r.review_text, r.sync_status, r.sync_error, r.is_deleted, r.created_at
       FROM product_reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? AND r.is_deleted = 0 ORDER BY r.created_at DESC`,
      productId,
    );
    return rows.map(mapReviewRow);
  }

  async saveReview(input: Omit<ProductReview, 'id' | 'createdAt' | 'reviewerName'> & { reviewerName: string }): Promise<ProductReview> {
    const database = await getDatabase();
    const now = new Date().toISOString();
    const reviewId = generateId('rev');
    await database.runAsync(
      `INSERT INTO users (id, full_name, email, phone_country, phone_dial_code, phone_number)
       VALUES (?, ?, ?, 'ZZ', '+0', '0000')
       ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, updated_at = ?`,
      input.userId,
      input.reviewerName,
      `${input.userId}@local.skynova.invalid`,
      now,
    );
    await database.runAsync(
      `INSERT INTO product_reviews (id, product_id, user_id, rating, review_text, sync_status, sync_error, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?)
       ON CONFLICT(product_id, user_id) DO UPDATE SET
         rating = excluded.rating, review_text = excluded.review_text,
         sync_status = 'pending', sync_error = NULL, is_deleted = 0, created_at = excluded.created_at`,
      reviewId,
      input.productId,
      input.userId,
      input.rating,
      input.reviewText?.trim() || null,
      now,
    );
    if (await hasNetworkConnection()) {
      try {
        await syncReviewToFirebase({
          ...input,
          id: reviewId,
          createdAt: now,
          reviewerName: input.reviewerName,
          reviewText: input.reviewText?.trim() || undefined,
        });
        await database.runAsync(
          "UPDATE product_reviews SET sync_status = 'synced', sync_error = NULL WHERE product_id = ? AND user_id = ?",
          input.productId,
          input.userId,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo publicar la reseña.';
        await database.runAsync(
          "UPDATE product_reviews SET sync_status = 'error', sync_error = ? WHERE product_id = ? AND user_id = ?",
          message.slice(0, 500),
          input.productId,
          input.userId,
        );
      }
    }
    const rows = await this.listReviews(input.productId);
    const saved = rows.find((review) => review.userId === input.userId);
    if (!saved) throw new Error('No se pudo recuperar la calificación guardada.');
    invalidateProductCatalogCache();
    return saved;
  }

  async deleteReview(productId: string, userId: string): Promise<'synced' | 'pending' | 'error'> {
    const database = await getDatabase();
    const existing = await database.getFirstAsync<{ is_deleted: number; sync_status: string }>(
      'SELECT is_deleted, sync_status FROM product_reviews WHERE product_id = ? AND user_id = ?',
      productId,
      userId,
    );
    if (!existing || existing.is_deleted) {
      return existing?.is_deleted ? (existing.sync_status === 'error' ? 'error' : 'pending') : 'synced';
    }
    await database.runAsync(
      "UPDATE product_reviews SET is_deleted = 1, sync_status = 'pending', sync_error = NULL, created_at = ? WHERE product_id = ? AND user_id = ?",
      new Date().toISOString(),
      productId,
      userId,
    );
    if (!(await hasNetworkConnection())) return 'pending';
    try {
      await deleteReviewFromFirebase(productId, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la reseña.';
      await database.runAsync(
        "UPDATE product_reviews SET sync_status = 'error', sync_error = ? WHERE product_id = ? AND user_id = ?",
        message.slice(0, 500),
        productId,
        userId,
      );
      return 'error';
    }
    await database.runAsync(
      'DELETE FROM product_reviews WHERE product_id = ? AND user_id = ?',
      productId,
      userId,
    );
    invalidateProductCatalogCache();
    return 'synced';
  }

  async syncPendingReviews(onSyncError?: (error: unknown) => void): Promise<number> {
    if (!(await hasNetworkConnection())) return 0;
    const database = await getDatabase();
    const pushed = await this.pushPendingReviews(database, undefined, onSyncError);
    if (pushed > 0) invalidateProductCatalogCache();
    return pushed;
  }

  async listUserReviews(userId: string, onSyncError?: (error: unknown) => void): Promise<UserReviewItem[]> {
    const database = await getDatabase();
    let cloudReviews: ProductReview[] = [];
    try {
      cloudReviews = await getUserReviewsFromFirebase(userId);
    } catch (error) {
      onSyncError?.(error);
    }
    await this.cacheCloudReviews(database, cloudReviews);
    if (await hasNetworkConnection()) {
      const pushed = await this.pushPendingReviews(database, undefined, onSyncError);
      if (pushed > 0) invalidateProductCatalogCache();
    }
    const rows = await database.getAllAsync<UserReviewRow>(
      `SELECT r.id, r.product_id, r.user_id, u.full_name, r.rating, r.review_text, r.sync_status, r.sync_error, r.is_deleted, r.created_at,
         p.name AS product_name, p.price AS product_price, p.currency AS product_currency,
         (SELECT i.image_url FROM product_images i
          WHERE i.product_id = r.product_id AND i.is_primary = 1 LIMIT 1) AS product_image_url
       FROM product_reviews r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN products p ON p.id = r.product_id
       WHERE r.user_id = ? AND r.is_deleted = 0
       ORDER BY r.created_at DESC`,
      userId,
    );
    return rows.map((row) => ({
      ...mapReviewRow(row),
      productName: row.product_name ?? 'Producto',
      productImageUrl: row.product_image_url ?? undefined,
      productPrice: row.product_price ?? undefined,
      productCurrency: row.product_currency ?? undefined,
    }));
  }

  private async cacheCloudReviews(database: SQLite.SQLiteDatabase, cloudReviews: ProductReview[]) {
    for (const review of cloudReviews) {
      await database.runAsync(
        `INSERT INTO users (id, full_name, email, phone_country, phone_dial_code, phone_number)
         VALUES (?, ?, ?, 'ZZ', '+0', '0000')
         ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, updated_at = ?`,
        review.userId,
        review.reviewerName,
        `${review.userId}@local.skynova.invalid`,
        review.createdAt,
      );
      await database.runAsync(
        `INSERT INTO product_reviews (id, product_id, user_id, rating, review_text, sync_status, sync_error, created_at)
         VALUES (?, ?, ?, ?, ?, 'synced', NULL, ?)
         ON CONFLICT(product_id, user_id) DO UPDATE SET
           rating = excluded.rating, review_text = excluded.review_text,
           sync_status = 'synced', sync_error = NULL, created_at = excluded.created_at
         WHERE product_reviews.is_deleted = 0 AND product_reviews.sync_status = 'synced'`,
        review.id,
        review.productId,
        review.userId,
        review.rating,
        review.reviewText ?? null,
        review.createdAt,
      );
    }
  }

  private async pushPendingReviews(
    database: SQLite.SQLiteDatabase,
    productId: string | undefined,
    onSyncError?: (error: unknown) => void,
  ): Promise<number> {
    const rows = await database.getAllAsync<ReviewRow>(
      `SELECT r.id, r.product_id, r.user_id, u.full_name, r.rating, r.review_text, r.sync_status, r.sync_error, r.is_deleted, r.created_at
       FROM product_reviews r JOIN users u ON u.id = r.user_id
       WHERE (r.sync_status != 'synced' OR r.is_deleted = 1) ${productId ? 'AND r.product_id = ?' : ''}
       ORDER BY r.created_at ASC`,
      ...(productId ? [productId] : []),
    );
    let firstError: unknown;
    let syncedCount = 0;
    for (const row of rows) {
      if (row.is_deleted) {
        try {
          await deleteReviewFromFirebase(row.product_id, row.user_id);
          await database.runAsync(
            'DELETE FROM product_reviews WHERE id = ?',
            row.id,
          );
          syncedCount += 1;
        } catch (error) {
          if (isAuthSessionError(error, row.user_id)) break;
          const message = error instanceof Error ? error.message : 'No se pudo eliminar la reseña.';
          await database.runAsync(
            "UPDATE product_reviews SET sync_status = 'error', sync_error = ? WHERE id = ?",
            message.slice(0, 500),
            row.id,
          );
          firstError ??= error;
        }
        continue;
      }
      const review = mapReviewRow(row);
      try {
        await syncReviewToFirebase(review);
        await database.runAsync(
          "UPDATE product_reviews SET sync_status = 'synced', sync_error = NULL WHERE id = ?",
          row.id,
        );
        syncedCount += 1;
      } catch (error) {
        if (isAuthSessionError(error, row.user_id)) break;
        const message = error instanceof Error ? error.message : 'No se pudo publicar la reseña.';
        await database.runAsync(
          "UPDATE product_reviews SET sync_status = 'error', sync_error = ? WHERE id = ?",
          message.slice(0, 500),
          row.id,
        );
        firstError ??= error;
      }
    }
    if (firstError !== undefined) onSyncError?.(firstError);
    return syncedCount;
  }

  private async loadCatalog() {
    if (!catalogCachePromise) {
      catalogCachePromise = this.loadCatalogUncached().catch((error: unknown) => {
        catalogCachePromise = undefined;
        throw error;
      });
    }
    return catalogCachePromise;
  }

  private async loadCatalogUncached() {
    await this.ensureCatalogSeeded();
    const database = await getDatabase();
    const categoryRows = await database.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY name');
    const categories = categoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      productType: row.product_type,
      icon: categoryIcons[row.id] ?? categoryIconFor(row.product_type),
    } satisfies ProductCategory));
    const rows = await database.getAllAsync<ProductRow>(
      `SELECT p.*, d.max_flight_minutes,
        (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id) AS rating_average,
        (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id) AS rating_count,
        (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
          JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.status != 'cancelled') AS sales_count
       FROM products p LEFT JOIN drone_specs d ON d.product_id = p.id`,
    );
    const imageRows = await database.getAllAsync<ImageRow>(
      'SELECT * FROM product_images ORDER BY product_id, display_order',
    );
    const imagesByProduct = new Map<string, ProductImage[]>();
    for (const row of imageRows) {
      const images = imagesByProduct.get(row.product_id) ?? [];
      images.push({
        id: row.id,
        url: row.image_url,
        altText: row.alt_text,
        displayOrder: row.display_order,
        isPrimary: row.is_primary === 1,
      });
      imagesByProduct.set(row.product_id, images);
    }
    const catalogProducts = rows.map((row) => {
      const images = imagesByProduct.get(row.id) ?? [];
      const primary = images.find((image) => image.isPrimary) ?? images[0];
      return {
        id: row.id,
        categoryId: row.category_id,
        sku: row.sku,
        name: row.name,
        description: row.description ?? '',
        productType: row.product_type,
        brand: row.brand ?? '',
        price: row.price,
        compareAtPrice: row.compare_at_price ?? undefined,
        currency: row.currency,
        stockQuantity: row.stock_quantity,
        isActive: row.is_active === 1,
        isFeatured: row.is_featured === 1,
        isHomeVisible: row.is_home_visible === 1,
        maxFlightMinutes: row.max_flight_minutes ?? undefined,
        ratingAverage: row.rating_average ? Number(row.rating_average) : undefined,
        ratingCount: row.rating_count ? Number(row.rating_count) : undefined,
        salesCount: Number(row.sales_count) || 0,
        createdAt: row.created_at,
        imageUrl: primary?.url,
        imageAlt: primary?.altText,
        images,
      } satisfies Product;
    });
    return { categories, products: catalogProducts };
  }

  private async importRemoteCatalog() {
    const remote = restApiConfigured
      ? await getCatalogFromRest()
      : await getCatalogFromFirebase();
    if (!remote || remote.products.length === 0) return false;
    const now = new Date().toISOString();
    const remoteCategories = remote.categories.map((row) => ({
      id: row.id,
      name: requiredRemoteString(row, 'name'),
      productType: requiredProductType(row.product_type),
    }));
    const categoryIds = new Set(remoteCategories.map((category) => category.id));
    const remoteProducts = remote.products.map((row) => {
      const categoryId = requiredRemoteString(row, 'category_id');
      const productType = requiredProductType(row.product_type);
      if (!categoryIds.has(categoryId)) {
        throw new Error(`El producto ${row.id} referencia una categoría que no existe en Firebase.`);
      }
      if (requiredRemoteString(row, 'currency').length !== 3) {
        throw new Error(`El producto ${row.id} tiene una moneda inválida.`);
      }
      const price = requiredRemoteNumber(row, 'price');
      const compareAtPrice = optionalRemoteNumber(row, 'compare_at_price');
      const stockQuantity = requiredRemoteNumber(row, 'stock_quantity');
      if (
        price < 0
        || (compareAtPrice !== undefined && compareAtPrice <= price)
        || !Number.isSafeInteger(stockQuantity)
        || stockQuantity < 0
      ) {
        throw new Error(`El producto ${row.id} tiene precio o inventario inválido.`);
      }
      return {
        id: row.id,
        categoryId,
        sku: requiredRemoteString(row, 'sku'),
        name: requiredRemoteString(row, 'name'),
        description: optionalRemoteString(row, 'description') ?? null,
        productType,
        brand: optionalRemoteString(row, 'brand') ?? null,
        price,
        compareAtPrice: compareAtPrice ?? null,
        currency: requiredRemoteString(row, 'currency').toUpperCase(),
        stockQuantity,
        isActive: optionalRemoteBoolean(row, 'is_active', true),
        isFeatured: optionalRemoteBoolean(row, 'is_featured', false),
        isHomeVisible: optionalRemoteBoolean(row, 'is_home_visible', true),
        createdAt: optionalRemoteString(row, 'created_at') ?? now,
        updatedAt: optionalRemoteString(row, 'updated_at') ?? now,
      };
    });
    const remoteProductIds = new Set(remoteProducts.map((product) => product.id));
    const remoteSpecs = remote.specs.map((row) => {
      const productId = optionalRemoteString(row, 'product_id') ?? row.id;
      const maxFlightMinutes = requiredRemoteNumber(row, 'max_flight_minutes');
      if (!remoteProductIds.has(productId) || !Number.isSafeInteger(maxFlightMinutes) || maxFlightMinutes <= 0) {
        throw new Error(`La ficha técnica ${row.id} es inválida en Firebase.`);
      }
      return { productId, maxFlightMinutes };
    });
    const remoteImages = remote.images.map((row) => {
      const productId = requiredRemoteString(row, 'product_id');
      const displayOrder = optionalRemoteNumber(row, 'display_order') ?? 0;
      if (!remoteProductIds.has(productId) || !Number.isSafeInteger(displayOrder) || displayOrder < 0) {
        throw new Error(`La imagen ${row.id} es inválida en Firebase.`);
      }
      return {
        id: row.id,
        productId,
        imageUrl: requiredRemoteString(row, 'image_url'),
        altText: requiredRemoteString(row, 'alt_text'),
        displayOrder,
        isPrimary: optionalRemoteBoolean(row, 'is_primary', false),
        createdAt: optionalRemoteString(row, 'created_at') ?? now,
      };
    });
    const remoteReviews = await getAllProductReviewsFromFirebase();
    const database = await getDatabase();
    await withDatabaseTransaction(database, async () => {
      for (const category of remoteCategories) {
        await database.runAsync(
          `INSERT INTO categories (id, name, product_type) VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, product_type = excluded.product_type`,
          category.id,
          category.name,
          category.productType,
        );
      }
      const localProducts = await database.getAllAsync<{ id: string }>('SELECT id FROM products');
      for (const localProduct of localProducts) {
        if (!remoteProductIds.has(localProduct.id)) {
          await database.runAsync(
            'UPDATE products SET is_active = 0, is_home_visible = 0 WHERE id = ?',
            localProduct.id,
          );
        }
      }
      for (const product of remoteProducts) {
        await database.runAsync(
          `INSERT INTO products
            (id, category_id, sku, name, description, product_type, brand, price, compare_at_price,
             currency, stock_quantity, stock_base_quantity, is_active, is_featured, is_home_visible, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, sku = excluded.sku,
             name = excluded.name, description = excluded.description, product_type = excluded.product_type,
             brand = excluded.brand, price = excluded.price, compare_at_price = excluded.compare_at_price,
             currency = excluded.currency,
             stock_quantity = MAX(0, excluded.stock_quantity - MAX(0, COALESCE(stock_base_quantity, products.stock_quantity) - products.stock_quantity)),
             stock_base_quantity = excluded.stock_quantity,
             is_active = excluded.is_active, is_featured = excluded.is_featured,
             is_home_visible = excluded.is_home_visible, updated_at = excluded.updated_at`,
          product.id,
          product.categoryId,
          product.sku,
          product.name,
          product.description,
          product.productType,
          product.brand,
          product.price,
          product.compareAtPrice,
          product.currency,
          product.stockQuantity,
          product.stockQuantity,
          product.isActive ? 1 : 0,
          product.isFeatured ? 1 : 0,
          product.isHomeVisible ? 1 : 0,
          product.createdAt,
          product.updatedAt,
        );
        await database.runAsync('DELETE FROM drone_specs WHERE product_id = ?', product.id);
        await database.runAsync('DELETE FROM product_images WHERE product_id = ?', product.id);
      }
      for (const spec of remoteSpecs) {
        await database.runAsync(
          'INSERT INTO drone_specs (product_id, max_flight_minutes) VALUES (?, ?)',
          spec.productId,
          spec.maxFlightMinutes,
        );
      }
      for (const image of remoteImages) {
        await database.runAsync(
          `INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          image.id,
          image.productId,
          image.imageUrl,
          image.altText,
          image.displayOrder,
          image.isPrimary ? 1 : 0,
          image.createdAt,
        );
      }
      for (const review of remoteReviews) {
        if (!remoteProductIds.has(review.productId)) continue;
        await database.runAsync(
          `INSERT INTO users (id, full_name, email, phone_country, phone_dial_code, phone_number)
           VALUES (?, ?, ?, 'ZZ', '+0', '0000')
           ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, updated_at = ?`,
          review.userId,
          review.reviewerName,
          `${review.userId}@local.skynova.invalid`,
          now,
        );
        await database.runAsync(
          `INSERT INTO product_reviews (id, product_id, user_id, rating, review_text, sync_status, sync_error, created_at)
           VALUES (?, ?, ?, ?, ?, 'synced', NULL, ?)
           ON CONFLICT(product_id, user_id) DO UPDATE SET
             rating = excluded.rating, review_text = excluded.review_text,
             sync_status = 'synced', sync_error = NULL, created_at = excluded.created_at
           WHERE product_reviews.is_deleted = 0 AND product_reviews.sync_status = 'synced'`,
          review.id,
          review.productId,
          review.userId,
          review.rating,
          review.reviewText ?? null,
          review.createdAt,
        );
      }
    });
    invalidateProductCatalogCache();
    return true;
  }

  private async ensureCatalogSeeded() {
    if (!catalogSeedPromise) {
      catalogSeedPromise = (async () => {
        const database = await getDatabase();
        const result = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM products');
        if ((result?.count ?? 0) > 0) return;
        const now = new Date().toISOString();
        await withDatabaseTransaction(database, async () => {
          for (const category of categories) {
            await database.runAsync(
              'INSERT OR IGNORE INTO categories (id, name, product_type) VALUES (?, ?, ?)',
              category.id,
              category.name,
              category.productType,
            );
          }
          for (const product of products) {
            await database.runAsync(
              `INSERT OR IGNORE INTO products (
                id, category_id, sku, name, description, product_type, brand, price,
                compare_at_price, currency, stock_quantity, is_active, is_featured,
                is_home_visible, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              product.id,
              product.categoryId,
              product.sku,
              product.name,
              product.description,
              product.productType,
              product.brand || null,
              product.price,
              product.compareAtPrice ?? null,
              product.currency,
              product.stockQuantity,
              product.isActive ? 1 : 0,
              product.isFeatured ? 1 : 0,
              product.isHomeVisible === false ? 0 : 1,
              product.createdAt ?? now,
              now,
            );
            if (product.productType === 'drone' && product.maxFlightMinutes) {
              await database.runAsync(
                'INSERT OR IGNORE INTO drone_specs (product_id, max_flight_minutes) VALUES (?, ?)',
                product.id,
                product.maxFlightMinutes,
              );
            }
            if (product.imageUrl) {
              await database.runAsync(
                `INSERT OR IGNORE INTO product_images
                  (id, product_id, image_url, alt_text, display_order, is_primary)
                 VALUES (?, ?, ?, ?, 0, 1)`,
                `${product.id}-image-0`,
                product.id,
                product.imageUrl,
                product.imageAlt ?? product.name,
              );
            }
          }
        });
      })().catch((error: unknown) => {
        catalogSeedPromise = undefined;
        throw error;
      });
    }
    await catalogSeedPromise;
  }
}

type CategoryRow = { id: string; name: string; product_type: Product['productType'] };
type ProductRow = {
  id: string;
  category_id: string;
  sku: string;
  name: string;
  description: string | null;
  product_type: Product['productType'];
  brand: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock_quantity: number;
  is_active: number;
  is_featured: number;
  is_home_visible: number;
  created_at: string;
  max_flight_minutes: number | null;
  rating_average: number | null;
  rating_count: number;
  sales_count: number;
};
type ImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string;
  display_order: number;
  is_primary: number;
};
type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  full_name: string;
  rating: number;
  review_text: string | null;
  sync_status: 'pending' | 'synced' | 'error';
  sync_error: string | null;
  is_deleted: number;
  created_at: string;
};

type UserReviewRow = ReviewRow & {
  product_name: string | null;
  product_price: number | null;
  product_currency: string | null;
  product_image_url: string | null;
};

function mapReviewRow(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    reviewerName: row.full_name,
    rating: row.rating,
    reviewText: row.review_text ?? undefined,
    createdAt: row.created_at,
    syncStatus: row.sync_status,
  };
}

function categoryIconFor(type: Product['productType']) {
  if (type === 'drone') return 'quadcopter';
  return type === 'accessory' ? 'toolbox-outline' : 'cog-outline';
}

function requiredRemoteString(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`El catálogo de Firebase no contiene un ${key} válido.`);
  }
  return value;
}

function optionalRemoteString(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error(`El campo ${key} del catálogo de Firebase debe ser texto.`);
  return value;
}

function requiredRemoteNumber(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`El campo ${key} del catálogo de Firebase debe ser numérico.`);
  }
  return value;
}

function optionalRemoteNumber(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`El campo ${key} del catálogo de Firebase debe ser numérico.`);
  }
  return value;
}

function optionalRemoteBoolean(row: Record<string, unknown>, key: string, fallback: boolean) {
  const value = row[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') throw new Error(`El campo ${key} del catálogo de Firebase debe ser booleano.`);
  return value;
}

function requiredProductType(value: unknown): Product['productType'] {
  if (value !== 'drone' && value !== 'accessory' && value !== 'spare_part') {
    throw new Error('El catálogo de Firebase contiene un tipo de producto inválido.');
  }
  return value;
}

function buildSearchText(product: Product, categoriesById: Map<string, ProductCategory>) {
  const category = categoriesById.get(product.categoryId);
  const typeLabels: Record<Product['productType'], string> = {
    drone: 'dron drone drones aeronave',
    accessory: 'accesorio accesorios',
    spare_part: 'repuesto repuestos pieza piezas',
  };
  const searchTerms = [
    product.name,
    product.brand,
    `marca ${product.brand}`,
    product.sku,
    `sku ${product.sku}`,
    product.description,
    category?.name,
    typeLabels[product.productType],
    `precio price ${product.price}`,
    product.currency,
    product.compareAtPrice,
    product.compareAtPrice ? 'oferta ofertas offer offers descuento discount' : undefined,
    product.isFeatured ? 'destacado destacados popular populares' : undefined,
    product.maxFlightMinutes,
    product.maxFlightMinutes ? `minutos de vuelo autonomia ${product.maxFlightMinutes} min` : undefined,
    product.ratingAverage,
    product.ratingCount,
    product.ratingAverage ? 'mejor mejor valorado mejor valorados calificacion estrellas rated' : undefined,
    product.salesCount,
    product.salesCount ? 'mas vendidos mas vendido bestseller' : undefined,
    product.createdAt ? 'nuevo nuevos reciente recientes novedad novedades latest' : undefined,
    product.stockQuantity,
    product.stockQuantity > 0 ? 'disponible disponibilidad en stock' : 'agotado sin stock',
  ];
  return normalizeSearchText(searchTerms.filter((value) => value !== undefined).join(' '));
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getSearchTerms(value: string) {
  return normalizeSearchText(value).split(/\s+/).filter(Boolean);
}

function scoreSearchMatch(
  candidate: { name: string; brand: string; sku: string; text: string },
  query: string,
) {
  if (candidate.name.startsWith(query)) return 4;
  if (candidate.sku.startsWith(query)) return 3;
  if (candidate.brand.startsWith(query)) return 2;
  return candidate.text.includes(query) ? 1 : 0;
}

function cloneProduct(product: Product): Product {
  return product.images ? { ...product, images: product.images.map((image) => ({ ...image })) } : { ...product };
}

function interleaveRelevantProducts(productsToRank: Product[]) {
  const queues: Product[][] = [[], [], [], []];
  for (const product of productsToRank) {
    const isOffer = product.compareAtPrice !== undefined && product.compareAtPrice > product.price;
    const isFeatured = product.isFeatured === true;
    const queueIndex = isOffer
      ? isFeatured ? 0 : 2
      : isFeatured ? 1 : 3;
    queues[queueIndex].push(product);
  }

  const compareWithinGroup = (left: Product, right: Product) =>
    (right.salesCount ?? 0) - (left.salesCount ?? 0)
    || (right.ratingAverage ?? 0) - (left.ratingAverage ?? 0)
    || left.id.localeCompare(right.id);
  queues.forEach((queue) => queue.sort(compareWithinGroup));

  const positions = queues.map(() => 0);
  const interleaved: Product[] = [];
  let remaining = productsToRank.length;
  while (remaining > 0) {
    queues.forEach((queue, index) => {
      const position = positions[index];
      if (position < queue.length) {
        interleaved.push(queue[position]);
        positions[index] = position + 1;
        remaining -= 1;
      }
    });
  }
  return interleaved;
}

function compareProducts(left: Product, right: Product, sortBy: NonNullable<ProductQuery['sortBy']>) {
  switch (sortBy) {
    case 'price_asc': return left.price - right.price;
    case 'price_desc': return right.price - left.price;
    case 'best_selling': return (right.salesCount ?? 0) - (left.salesCount ?? 0);
    case 'best_rated': return (right.ratingAverage ?? 0) - (left.ratingAverage ?? 0);
    case 'newest': return Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '');
    default: return (right.salesCount ?? 0) - (left.salesCount ?? 0);
  }
}
