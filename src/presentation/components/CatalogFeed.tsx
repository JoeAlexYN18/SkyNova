import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Product, ProductBrand, ProductCategory } from '@/domain/entities/Product';
import type { ProductPage, ProductSort } from '@/domain/repositories/IProductRepository';
import { productRepository } from '@/infrastructure/container';
import { ProductListItem, type CatalogEntryOptions } from '@/presentation/components/HomeFeed';
import { ProductSearchBar } from '@/presentation/components/ProductSearchBar';
import { styles } from '@/presentation/screens/HomeScreen.styles';
import { colors } from '@/shared/theme';

export type CatalogInitialFilters = Omit<CatalogEntryOptions, 'openFilters'>;

type CatalogFeedProps = {
  initialFilters: CatalogInitialFilters;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onEnterSearchMode: () => void;
  onRegisterSearchHandler: (handler: ((query: string) => void) | null) => void;
  openFiltersOnStart: boolean;
  onAddProduct: (product: Product) => void;
  onOpenProduct: (product: Product) => void;
  recentSearches: string[];
  onRememberSearch: (query: string) => void;
  suggestionsVisible: boolean;
  onSuggestionsVisibilityChange: (visible: boolean) => void;
};

type CatalogGroup = 'drones' | 'accessories' | 'spare_parts';
type TypeCounts = Record<CatalogGroup, number>;
type BudgetRange = { id: string; label: string; minPrice?: number; maxPrice?: number };

const PAGE_SIZE = 8;
const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'best_selling', label: 'Más vendidos' },
  { value: 'best_rated', label: 'Mejor valorados' },
  { value: 'newest', label: 'Más recientes' },
];

const GROUP_CATEGORY_IDS: Record<CatalogGroup, string[]> = {
  drones: ['cat-drones-4k', 'cat-drones-8k', 'cat-fpv-carreras', 'cat-drones-cine'],
  accessories: ['cat-baterias', 'cat-filtros-nd', 'cat-protecciones'],
  spare_parts: ['cat-repuestos', 'cat-brazos', 'cat-motores'],
};

const EMPTY_COUNTS: TypeCounts = { drones: 0, accessories: 0, spare_parts: 0 };
const BUDGET_RANGES: BudgetRange[] = [
  { id: 'all', label: 'Cualquier presupuesto' },
  { id: 'under-300', label: 'Menos de $300', maxPrice: 299.99 },
  { id: '300-799', label: '$300–$799', minPrice: 300, maxPrice: 799.99 },
  { id: '800-1499', label: '$800–$1,499', minPrice: 800, maxPrice: 1499.99 },
  { id: '1500-plus', label: '$1,500 o más', minPrice: 1500 },
];
const MIN_FLIGHT_OPTIONS = [20, 30, 40, 50] as const;

export function CatalogFeed({
  initialFilters,
  searchDraft,
  onSearchDraftChange,
  onEnterSearchMode,
  onRegisterSearchHandler,
  openFiltersOnStart,
  onAddProduct,
  onOpenProduct,
  recentSearches,
  onRememberSearch,
  suggestionsVisible,
  onSuggestionsVisibilityChange,
}: CatalogFeedProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [search, setSearch] = useState(initialFilters.search ?? '');
  const [selectedGroups, setSelectedGroups] = useState<CatalogGroup[]>(
    initialFilters.productGroups ?? (initialFilters.productGroup ? [initialFilters.productGroup] : []),
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() => initialFilters.categoryId ? [initialFilters.categoryId] : []);
  const [brand, setBrand] = useState<string | undefined>(initialFilters.brand);
  const [budgetRangeId, setBudgetRangeId] = useState<string>('all');
  const [minFlightMinutes, setMinFlightMinutes] = useState<number | undefined>();
  const [isOfferOnly, setIsOfferOnly] = useState(initialFilters.isOffer ?? false);
  const [isFeaturedOnly, setIsFeaturedOnly] = useState(initialFilters.isFeatured ?? false);
  const [sortBy, setSortBy] = useState<ProductSort>(initialFilters.sortBy ?? 'relevance');
  const [typeCounts, setTypeCounts] = useState<TypeCounts>(EMPTY_COUNTS);
  const [pageResult, setPageResult] = useState<ProductPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(openFiltersOnStart);
  const [isSortVisible, setIsSortVisible] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const loadMoreRequest = useRef(0);
  const selectedBudgetRange = BUDGET_RANGES.find((range) => range.id === budgetRangeId) ?? BUDGET_RANGES[0];
  const categoryFilterIds = useMemo(
    () => selectedGroups.length
      ? selectedCategoryIds.length
        ? selectedCategoryIds
        : selectedGroups.flatMap((group) => GROUP_CATEGORY_IDS[group])
      : selectedCategoryIds,
    [selectedGroups, selectedCategoryIds],
  );
  const selectedFlightFilter = selectedGroups.length === 0
    || (selectedGroups.length === 1 && selectedGroups[0] === 'drones')
    ? minFlightMinutes
    : undefined;
  const canReturnToFullCatalog = Boolean(
    search.trim()
    || selectedGroups.length
    || selectedCategoryIds.length
    || brand
    || budgetRangeId !== 'all'
    || minFlightMinutes
    || isOfferOnly
    || isFeaturedOnly
    || sortBy !== 'relevance',
  );
  const selectSuggestedCategory = (category: ProductCategory) => {
    const categoryGroup = (Object.keys(GROUP_CATEGORY_IDS) as CatalogGroup[])
      .find((group) => GROUP_CATEGORY_IDS[group].includes(category.id));
    setSelectedGroups(categoryGroup ? [categoryGroup] : []);
    setSelectedCategoryIds([category.id]);
    setBrand(undefined);
    setSearch('');
  };
  const selectSuggestedBrand = (suggestedBrand: ProductBrand) => {
    setSelectedGroups([]);
    setSelectedCategoryIds([]);
    setBrand(suggestedBrand.name);
    setSearch('');
  };

  useEffect(() => {
    let active = true;
    Promise.all([productRepository.listCategories(), productRepository.listBrands()]).then(([categoryResult, brandResult]) => {
      if (active) {
        setCategories(categoryResult);
        setBrands(brandResult);
        const initialCategory = categoryResult.find((category) => category.id === initialFilters.categoryId);
        if (initialCategory) {
          const categoryGroup = (Object.keys(GROUP_CATEGORY_IDS) as CatalogGroup[])
            .find((group) => GROUP_CATEGORY_IDS[group].includes(initialCategory.id));
          if (categoryGroup) setSelectedGroups([categoryGroup]);
        }
      }
    }).catch(() => {
      if (active) setHasError(true);
    });
    return () => { active = false; };
  }, [initialFilters.categoryId]);

  useEffect(() => {
    let active = true;
    loadMoreRequest.current += 1;
    const timeout = setTimeout(() => {
      setIsLoading(true);
      setIsLoadingMore(false);
      setHasError(false);
      setPageResult(null);
      productRepository.listProducts({
        search,
        brand,
        categoryIds: categoryFilterIds,
        isOffer: isOfferOnly,
        isFeatured: isFeaturedOnly,
        minPrice: selectedBudgetRange.minPrice,
        maxPrice: selectedBudgetRange.maxPrice,
        minFlightMinutes: selectedFlightFilter,
        sortBy,
        page: 1,
        pageSize: PAGE_SIZE,
      }).then((result) => {
        if (active) setPageResult(result);
      }).catch(() => {
        if (active) setHasError(true);
      }).finally(() => {
        if (active) setIsLoading(false);
      });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [search, categoryFilterIds, brand, selectedGroups, isOfferOnly, isFeaturedOnly, selectedBudgetRange, selectedFlightFilter, sortBy, reloadKey]);

  useEffect(() => {
    let active = true;
    const countForGroup = (group: CatalogGroup) => productRepository.listProducts({
      search,
      brand,
      categoryIds: (() => {
        const selectedGroupCategoryIds = selectedCategoryIds.filter((categoryId) => GROUP_CATEGORY_IDS[group].includes(categoryId));
        return selectedGroups.includes(group) && selectedGroupCategoryIds.length
          ? selectedGroupCategoryIds
          : GROUP_CATEGORY_IDS[group];
      })(),
      isOffer: isOfferOnly,
      isFeatured: isFeaturedOnly,
      minPrice: selectedBudgetRange.minPrice,
      maxPrice: selectedBudgetRange.maxPrice,
      minFlightMinutes: group === 'drones' ? selectedFlightFilter : undefined,
      page: 1,
      pageSize: 1,
    });

    const timeout = setTimeout(() => {
      Promise.all([
        countForGroup('drones'),
        countForGroup('accessories'),
        countForGroup('spare_parts'),
      ]).then(([drones, accessories, spareParts]) => {
        if (active) setTypeCounts({
          drones: drones.total,
          accessories: accessories.total,
          spare_parts: spareParts.total,
        });
      }).catch(() => {
        if (active) setTypeCounts(EMPTY_COUNTS);
      });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [search, brand, selectedGroups, selectedCategoryIds, isOfferOnly, isFeaturedOnly, selectedBudgetRange, selectedFlightFilter]);

  const visibleCategories = useMemo(
    () => selectedGroups.length
      ? categories.filter((category) => selectedGroups.some((group) => GROUP_CATEGORY_IDS[group].includes(category.id)))
      : [],
    [categories, selectedGroups],
  );

  const selectedCategories = useMemo(
    () => categories.filter((category) => selectedCategoryIds.includes(category.id)),
    [categories, selectedCategoryIds],
  );

  const activeFilterLabels = [
    ...(brand ? [`Marca: ${brand}`] : []),
    ...selectedCategories.map(formatCategoryLabel),
    ...(selectedBudgetRange.id !== 'all' ? [`Presupuesto: ${selectedBudgetRange.label}`] : []),
    ...(minFlightMinutes !== undefined ? [`Autonomía: ${minFlightMinutes} min o más`] : []),
  ];

  const toggleGroup = (group: CatalogGroup) => {
    setSelectedGroups((current) => current.includes(group)
      ? current.filter((selected) => selected !== group)
      : [...current, group]);
    setSelectedCategoryIds([]);
    if (group !== 'drones') setMinFlightMinutes(undefined);
  };

  const toggleCategory = (category: ProductCategory) => {
    setSelectedCategoryIds((current) => current.includes(category.id)
      ? current.filter((categoryId) => categoryId !== category.id)
      : [...current, category.id]);
  };

  const loadMore = async () => {
    if (!pageResult || isLoadingMore || pageResult.items.length >= pageResult.total) return;
    const requestId = ++loadMoreRequest.current;
    setIsLoadingMore(true);
    try {
      const nextPage = await productRepository.listProducts({
        search,
        categoryIds: categoryFilterIds,
        brand,
        isOffer: isOfferOnly,
        isFeatured: isFeaturedOnly,
        minPrice: selectedBudgetRange.minPrice,
        maxPrice: selectedBudgetRange.maxPrice,
        minFlightMinutes: selectedFlightFilter,
        sortBy,
        page: pageResult.page + 1,
        pageSize: PAGE_SIZE,
      });
      if (requestId === loadMoreRequest.current) {
        setPageResult((current) => current ? { ...nextPage, items: [...current.items, ...nextPage.items] } : nextPage);
      }
    } catch {
      if (requestId === loadMoreRequest.current) setHasError(true);
    } finally {
      if (requestId === loadMoreRequest.current) setIsLoadingMore(false);
    }
  };

  const clearFilters = useCallback(() => {
    setSearch('');
    onSearchDraftChange('');
    setSelectedGroups([]);
    setSelectedCategoryIds([]);
    setBrand(undefined);
    setBudgetRangeId('all');
    setMinFlightMinutes(undefined);
    setIsOfferOnly(false);
    setIsFeaturedOnly(false);
    setSortBy('relevance');
    setIsFilterVisible(false);
    setIsSortVisible(false);
    setReloadKey((current) => current + 1);
  }, [onSearchDraftChange]);

  useEffect(() => {
    onRegisterSearchHandler((query) => {
      if (!query) {
        clearFilters();
        return;
      }
      setSearch(query);
    });
    return () => onRegisterSearchHandler(null);
  }, [clearFilters, onRegisterSearchHandler]);

  const selectedSortLabel = SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? 'Relevancia';

  return (
    <>
      <ProductSearchBar
        value={searchDraft}
        suggestionsVisible={suggestionsVisible}
        onDraftChange={onSearchDraftChange}
        categories={categories}
        brands={brands}
        recentSearches={recentSearches}
        onSearch={(query) => {
          if (!query) {
            clearFilters();
            return;
          }
          setSearch(query);
        }}
        onRememberSearch={onRememberSearch}
        onOpenProduct={onOpenProduct}
        onSelectCategory={selectSuggestedCategory}
        onSelectBrand={selectSuggestedBrand}
        onSuggestionsVisibilityChange={onSuggestionsVisibilityChange}
        onEnterSearchMode={onEnterSearchMode}
        canReturnToFullCatalog={canReturnToFullCatalog}
        onReturnToFullCatalog={clearFilters}
        catalog
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catalogGroupRow}>
        <CatalogGroupChip
          label="Drones"
          icon="quadcopter"
          count={typeCounts.drones}
          selected={selectedGroups.includes('drones')}
          onPress={() => toggleGroup('drones')}
        />
        <CatalogGroupChip
          label="Accesorios"
          icon="toolbox-outline"
          count={typeCounts.accessories}
          selected={selectedGroups.includes('accessories')}
          onPress={() => toggleGroup('accessories')}
        />
        <CatalogGroupChip
          label="Repuestos"
          icon="cog-outline"
          count={typeCounts.spare_parts}
          selected={selectedGroups.includes('spare_parts')}
          onPress={() => toggleGroup('spare_parts')}
        />
      </ScrollView>

      {!!visibleCategories.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catalogCategoryRow}>
          {visibleCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.catalogCategoryChip, selectedCategoryIds.includes(category.id) && styles.catalogFilterChipActive]}
              onPress={() => toggleCategory(category)}
              accessibilityState={{ selected: selectedCategoryIds.includes(category.id) }}
            >
              <MaterialCommunityIcons
                name={category.icon as never}
                size={16}
                color={selectedCategoryIds.includes(category.id) ? colors.onPrimary : colors.textSecondary}
              />
              <Text style={[styles.catalogCategoryText, selectedCategoryIds.includes(category.id) && styles.catalogFilterTextActive]}>{formatCategoryLabel(category)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.catalogQuickFilters}>
          <TouchableOpacity
            style={[styles.catalogQuickChip, styles.catalogOfferChip, isOfferOnly && styles.catalogFilterChipActive]}
            onPress={() => setIsOfferOnly((current) => !current)}
            accessibilityState={{ selected: isOfferOnly }}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={15} color={isOfferOnly ? colors.onPrimary : '#FFB4A8'} />
            <Text style={[styles.catalogQuickText, styles.catalogOfferText, isOfferOnly && styles.catalogFilterTextActive]}>Ofertas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.catalogQuickChip, styles.catalogFeaturedChip, isFeaturedOnly && styles.catalogFilterChipActive]}
            onPress={() => setIsFeaturedOnly((current) => !current)}
            accessibilityState={{ selected: isFeaturedOnly }}
          >
            <MaterialCommunityIcons name="trophy-outline" size={15} color={isFeaturedOnly ? colors.onPrimary : '#FFD66E'} />
            <Text style={[styles.catalogQuickText, isFeaturedOnly && styles.catalogFilterTextActive]}>Destacados</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.catalogAdvancedFilterButton}
            onPress={() => setIsFilterVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir filtros avanzados del catálogo"
            accessibilityState={{ expanded: isFilterVisible }}
          >
            <MaterialCommunityIcons name="tune-variant" size={15} color={colors.textSecondary} />
            <Text style={styles.catalogAdvancedFilterText}>Filtros</Text>
          </TouchableOpacity>
      </View>
      <View style={styles.catalogSortRow}>
        <Text style={styles.catalogResultCount} accessibilityLiveRegion="polite">
          {isLoading ? 'Buscando productos…' : hasError ? 'No disponible' : `${(pageResult?.total ?? 0).toLocaleString('es')} productos`}
        </Text>
        <View style={styles.catalogSortContainer}>
          <TouchableOpacity
            style={styles.catalogSortButton}
            onPress={() => setIsSortVisible((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={`Ordenar: ${selectedSortLabel}`}
            accessibilityState={{ expanded: isSortVisible }}
          >
            <Text style={styles.catalogSortLabel}>{selectedSortLabel}</Text>
            <MaterialCommunityIcons name={isSortVisible ? 'chevron-up' : 'unfold-more-horizontal'} size={18} color={colors.primary} />
          </TouchableOpacity>
          {isSortVisible && (
            <>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsSortVisible(false)} accessibilityLabel="Cerrar opciones de orden" />
              <View style={styles.catalogSortMenu}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.catalogSortOption, sortBy === option.value && styles.catalogSortOptionSelected]}
                    onPress={() => {
                      setSortBy(option.value);
                      setIsSortVisible(false);
                    }}
                    accessibilityState={{ selected: sortBy === option.value }}
                  >
                    <Text style={[styles.catalogSortOptionText, sortBy === option.value && styles.catalogSortOptionTextSelected]}>{option.label}</Text>
                    {sortBy === option.value && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      {activeFilterLabels.length > 0 && (
        <View style={styles.catalogFilterSummary}>
          <Text style={styles.catalogFilterText}>
            {activeFilterLabels.join(' · ')}
          </Text>
          <TouchableOpacity onPress={clearFilters} accessibilityLabel="Quitar filtros">
            <MaterialCommunityIcons name="close-circle" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.catalogFeedback}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.catalogFeedbackText}>Cargando productos…</Text>
        </View>
      ) : hasError ? (
        <View style={styles.catalogFeedback}>
          <MaterialCommunityIcons name="wifi-alert" size={30} color={colors.textMuted} />
          <Text style={styles.catalogFeedbackText}>No pudimos cargar el catálogo.</Text>
          <TouchableOpacity style={styles.catalogRetryButton} onPress={() => setReloadKey((key) => key + 1)}>
            <Text style={styles.catalogRetryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : pageResult?.items.length ? (
        <View style={styles.catalogProducts}>
          {pageResult.items.map((product) => (
            <ProductListItem
              key={product.id}
              product={product}
              onAdd={onAddProduct}
              onOpen={onOpenProduct}
              showFeaturedBadge
            />
          ))}
          {pageResult.items.length < pageResult.total && (
            <TouchableOpacity style={styles.catalogLoadMore} onPress={loadMore} disabled={isLoadingMore}>
              {isLoadingMore
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={styles.catalogLoadMoreText}>Cargar más productos</Text>}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.catalogFeedback}>
          <MaterialCommunityIcons name="magnify-close" size={32} color={colors.textMuted} />
          <Text style={styles.catalogFeedbackText}>No encontramos productos con esos criterios.</Text>
          <TouchableOpacity style={styles.catalogRetryButton} onPress={clearFilters}>
            <Text style={styles.catalogRetryText}>Ver todo el catálogo</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={isFilterVisible} transparent animationType="slide" onRequestClose={() => setIsFilterVisible(false)}>
        <View style={styles.filterOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsFilterVisible(false)} accessibilityLabel="Cerrar filtros" />
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <View>
                <Text style={styles.filterTitle}>Filtrar catálogo</Text>
                <Text style={styles.filterSubtitle}>Marca, presupuesto y autonomía</Text>
              </View>
              <TouchableOpacity style={styles.filterClose} onPress={() => setIsFilterVisible(false)} accessibilityLabel="Cerrar filtros">
                <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterOptionsScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSectionTitle}>Marca</Text>
              <FilterChoice label="Todas las marcas" selected={!brand} icon="tag-outline" onPress={() => setBrand(undefined)} />
              {brands.map((catalogBrand) => (
                <FilterChoice
                  key={catalogBrand.name}
                  label={catalogBrand.name}
                  selected={brand === catalogBrand.name}
                  icon="tag-outline"
                  iconColor={catalogBrand.color}
                  onPress={() => setBrand((current) => current === catalogBrand.name ? undefined : catalogBrand.name)}
                />
              ))}
              <Text style={styles.filterSectionTitle}>Rango de presupuesto (USD)</Text>
              {BUDGET_RANGES.map((range) => (
                <FilterChoice
                  key={range.id}
                  label={range.label}
                  selected={budgetRangeId === range.id}
                  icon="cash-multiple"
                  onPress={() => setBudgetRangeId(range.id)}
                />
              ))}
                          {selectedGroups.length === 0 || (selectedGroups.length === 1 && selectedGroups[0] === 'drones') ? (
                <>
                  <Text style={styles.filterSectionTitle}>Autonomía mínima</Text>
                  <FilterChoice
                    label="Cualquier autonomía"
                    selected={minFlightMinutes === undefined}
                    icon="timer-outline"
                    onPress={() => setMinFlightMinutes(undefined)}
                  />
                  {MIN_FLIGHT_OPTIONS.map((minutes) => (
                    <FilterChoice
                      key={minutes}
                      label={`${minutes} min o más`}
                      selected={minFlightMinutes === minutes}
                      icon="timer-outline"
                      onPress={() => setMinFlightMinutes(minutes)}
                    />
                  ))}
                </>
              ) : null}
            </ScrollView>
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setIsFilterVisible(false)}
              accessibilityRole="button"
            >
              <Text style={styles.applyFiltersText}>Aplicar filtros</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function CatalogGroupChip({ label, icon, count, selected, onPress }: {
  label: string;
  icon: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.catalogGroupChip, selected && styles.catalogFilterChipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <MaterialCommunityIcons name={icon as never} size={20} color={selected ? colors.onPrimary : colors.textSecondary} />
      <Text style={[styles.catalogGroupText, selected && styles.catalogFilterTextActive]}>{label}</Text>
      <Text style={[styles.catalogGroupCount, selected && styles.catalogGroupCountActive]}>{count}</Text>
    </TouchableOpacity>
  );
}

function FilterChoice({ label, selected, icon, iconColor = colors.primary, onPress }: {
  label: string;
  selected: boolean;
  icon: string;
  iconColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterOption, selected && styles.filterOptionSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={styles.filterOptionLabel}>
        <MaterialCommunityIcons name={icon as never} size={20} color={iconColor} />
        <Text style={styles.filterOptionText}>{label}</Text>
      </View>
      <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={21} color={selected ? colors.primary : colors.textMuted} />
    </TouchableOpacity>
  );
}

function formatCategoryLabel(category: ProductCategory) {
  return category.productType === 'drone' ? category.name.replace(/^Drones\s+/i, '') : category.name;
}
