import type { ProductBrand } from '@/domain/entities/Product';


export const OFFICIAL_BRANDS: ProductBrand[] = [
  { name: 'DJI', color: '#22D3EE' },
  { name: 'Autel Robotics', color: '#588BFF' },
  { name: 'Skydio', color: '#B6E5FF' },
  { name: 'BetaFPV', color: '#FFAA78' },
  { name: 'GEPRC', color: '#9C83FF' },
  { name: 'Parrot', color: '#65D6A6' },
  { name: 'Holy Stone', color: '#F2CB64' },
];

const fallbackColors = ['#22D3EE', '#588BFF', '#65D6A6', '#FFAA78', '#9C83FF'];


export function mergeCatalogBrands(productBrandNames: string[]): ProductBrand[] {
  const brands = new Map(OFFICIAL_BRANDS.map((brand) => [brand.name.toLocaleLowerCase(), brand]));

  [...new Set(productBrandNames.map((name) => name.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .forEach((name) => {
      const key = name.toLocaleLowerCase();
      if (!brands.has(key)) {
        brands.set(key, { name, color: fallbackColors[brands.size % fallbackColors.length] });
      }
    });

  return [...brands.values()];
}
