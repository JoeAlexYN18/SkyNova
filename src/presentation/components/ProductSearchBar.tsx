import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Product, ProductBrand, ProductCategory } from '@/domain/entities/Product';
import { productRepository } from '@/infrastructure/container';
import { useToast } from '@/infrastructure/context/ToastContext';
import { colors } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { styles } from '@/presentation/screens/HomeScreen.styles';

type Props = {
  value?: string;
  suggestionsVisible: boolean;
  onDraftChange: (value: string) => void;
  categories: ProductCategory[];
  brands: ProductBrand[];
  recentSearches: string[];
  onSearch: (query: string) => void;
  onRememberSearch: (query: string) => void;
  onOpenProduct: (product: Product) => void;
  onSelectCategory: (category: ProductCategory) => void;
  onSelectBrand: (brand: ProductBrand) => void;
  onSuggestionsVisibilityChange: (visible: boolean) => void;
  onEnterSearchMode?: () => void;
  canReturnToFullCatalog?: boolean;
  onReturnToFullCatalog?: () => void;
  dedicated?: boolean;
  onBack?: () => void;
  catalog?: boolean;
};

const SUGGESTION_LIMIT = 5;
const SUGGESTION_DEBOUNCE_MS = 250;

export function ProductSearchBar({
  value = '',
  suggestionsVisible,
  onDraftChange,
  categories,
  brands,
  recentSearches,
  onSearch,
  onRememberSearch,
  onOpenProduct,
  onSelectCategory,
  onSelectBrand,
  onSuggestionsVisibilityChange,
  onEnterSearchMode,
  canReturnToFullCatalog = false,
  onReturnToFullCatalog,
  dedicated = false,
  onBack,
  catalog = false,
}: Props) {
  const draft = value ?? '';
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const suggestionCache = useRef(new Map<string, Product[]>());
  const { show } = useToast();
  const normalizedDraft = normalizeSuggestionText(draft);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const currentRequestId = ++requestId.current;

    if (!dedicated || !suggestionsVisible || normalizedDraft.length < 2) return;

    const cached = suggestionCache.current.get(normalizedDraft);
    searchTimeout.current = setTimeout(() => {
      if (cached) {
        setProductSuggestions(cached);
        return;
      }
      setIsLoadingSuggestions(true);
      productRepository.searchSuggestions(draft.trim(), SUGGESTION_LIMIT).then((matches) => {
        if (currentRequestId !== requestId.current) return;
        if (suggestionCache.current.size >= 20) {
          const oldestQuery = suggestionCache.current.keys().next().value;
          if (oldestQuery !== undefined) suggestionCache.current.delete(oldestQuery);
        }
        suggestionCache.current.set(normalizedDraft, matches);
        setProductSuggestions(matches);
      }).catch(() => {
        if (currentRequestId === requestId.current) {
          show('No se pudieron cargar las sugerencias.', 'error');
        }
      }).finally(() => {
        if (currentRequestId === requestId.current) setIsLoadingSuggestions(false);
      });
    }, cached ? 0 : SUGGESTION_DEBOUNCE_MS);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (currentRequestId === requestId.current) requestId.current += 1;
    };
  }, [dedicated, draft, normalizedDraft, show, suggestionsVisible]);

  useEffect(() => () => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
  }, []);

  const matchingCategories = useMemo(() => {
    return normalizedDraft ? categories.filter((category) => normalizeSuggestionText(category.name).includes(normalizedDraft)) : [];
  }, [categories, normalizedDraft]);
  const matchingBrands = useMemo(() => {
    return normalizedDraft ? brands.filter((brand) => normalizeSuggestionText(brand.name).includes(normalizedDraft)) : [];
  }, [brands, normalizedDraft]);
  const matchingRecentSearches = useMemo(() => recentSearches
    .filter((query) => normalizedDraft && normalizeSuggestionText(query).includes(normalizedDraft))
    .slice(0, 4), [normalizedDraft, recentSearches]);
  const hasSuggestions = matchingRecentSearches.length > 0
    || matchingCategories.length > 0
    || matchingBrands.length > 0
    || productSuggestions.length > 0;

  const setSuggestionsVisible = (visible: boolean) => {
    onSuggestionsVisibilityChange(visible);
  };

  const closeSuggestions = (dismissKeyboard = true) => {
    setSuggestionsVisible(false);
    if (dismissKeyboard) Keyboard.dismiss();
  };

  const submitSearch = (searchText = draft) => {
    const query = searchText.trim();
    if (dedicated && !query) return;
    closeSuggestions();
    onDraftChange(query);
    if (query) onRememberSearch(query);
    onSearch(query);
  };

  const selectCategory = (category: ProductCategory) => {
    onDraftChange('');
    setProductSuggestions([]);
    closeSuggestions();
    onSelectCategory(category);
  };

  const selectBrand = (brand: ProductBrand) => {
    onDraftChange('');
    setProductSuggestions([]);
    closeSuggestions();
    onSelectBrand(brand);
  };

  const selectProduct = (product: Product) => {
    closeSuggestions();
    onOpenProduct(product);
  };

  return (
    <View
      style={[
        dedicated ? styles.searchScreen : styles.searchContainer,
        !dedicated && catalog && styles.catalogSearchContainer,
      ]}
    >
      <View style={dedicated ? styles.searchScreenHeader : undefined}>
        {dedicated && (
          <TouchableOpacity
            style={styles.searchBackButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <MaterialCommunityIcons name="arrow-left" size={23} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={[styles.searchBox, styles.searchBoxCompact, dedicated && styles.searchScreenSearchBox]}>
        {!dedicated && catalog && canReturnToFullCatalog && (
          <TouchableOpacity
            style={styles.searchBackButton}
            onPress={onReturnToFullCatalog}
            accessibilityRole="button"
            accessibilityLabel="Volver al catálogo completo"
          >
            <MaterialCommunityIcons name="arrow-left" size={21} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <TextInput
          value={draft}
          onChangeText={(text) => {
            onDraftChange(text);
            setProductSuggestions([]);
            setIsLoadingSuggestions(false);
          }}
          onSubmitEditing={() => submitSearch()}
          submitBehavior={dedicated ? 'submit' : undefined}
          onFocus={() => {
            setIsLoadingSuggestions(false);
            if (dedicated) setSuggestionsVisible(true);
            else onEnterSearchMode?.();
          }}
          autoFocus={dedicated}
          placeholder="Buscar"
          placeholderTextColor={colors.placeholder}
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar"
        />
        {dedicated && !!draft && (
          <TouchableOpacity
            onPress={() => {
              onDraftChange('');
              setProductSuggestions([]);
              setIsLoadingSuggestions(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Borrar búsqueda"
          >
            <MaterialCommunityIcons name="close-circle" size={19} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        {dedicated && (
          <TouchableOpacity
            style={styles.searchSubmitButton}
            onPress={() => submitSearch()}
            accessibilityRole="button"
            accessibilityLabel="Buscar en el catálogo"
          >
            <MaterialCommunityIcons name="magnify" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        )}
        </View>
      </View>

      {dedicated && suggestionsVisible && normalizedDraft.length > 0 && (
        <View style={styles.searchScreenSuggestions}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            onScrollBeginDrag={() => Keyboard.dismiss()}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            contentContainerStyle={styles.searchScreenSuggestionsContent}
          >
            {renderSuggestions()}
          </ScrollView>
        </View>
      )}
    </View>
  );

  function renderSuggestions() {
    return (
      <>
        {!!matchingRecentSearches.length && (
          <SuggestionSection title="BÚSQUEDAS RECIENTES">
            {matchingRecentSearches.map((query) => (
              <SuggestionRow
                key={`recent-${query}`}
                icon="history"
                title={query}
                subtitle="Buscar de nuevo"
                onPress={() => submitSearch(query)}
              />
            ))}
          </SuggestionSection>
        )}
        <SuggestionRow
          icon="magnify"
          title={`Buscar "${draft.trim()}"`}
          subtitle="Ver todos los resultados"
          onPress={() => submitSearch()}
        />
        {!!productSuggestions.length && (
          <SuggestionSection title="PRODUCTOS">
            {productSuggestions.map((product) => (
              <SuggestionRow
                key={product.id}
                icon={productTypeIcon(product.productType)}
                title={product.name}
                subtitle={productSubtitle(product)}
                onPress={() => selectProduct(product)}
              />
            ))}
          </SuggestionSection>
        )}
        {!!matchingCategories.length && (
          <SuggestionSection title="CATEGORÍAS">
            {matchingCategories.map((category) => (
              <SuggestionRow
                key={category.id}
                icon={category.icon}
                title={category.name}
                subtitle={productTypeLabel(category.productType)}
                onPress={() => selectCategory(category)}
              />
            ))}
          </SuggestionSection>
        )}
        {!!matchingBrands.length && (
          <SuggestionSection title="MARCAS">
            {matchingBrands.map((brand) => (
              <SuggestionRow
                key={brand.name}
                icon="tag-outline"
                iconColor={brand.color}
                title={brand.name}
                subtitle="Ver productos de esta marca"
                onPress={() => selectBrand(brand)}
              />
            ))}
          </SuggestionSection>
        )}
        {isLoadingSuggestions && (
          <View style={styles.searchSuggestionStatus}>
            <Text style={styles.searchSuggestionHint}>Buscando productos...</Text>
          </View>
        )}
        {!hasSuggestions && !isLoadingSuggestions && (
          <View style={styles.searchSuggestionStatus}>
            <Text style={styles.searchSuggestionHint}>Sin sugerencias relacionadas.</Text>
          </View>
        )}
      </>
    );
  }
}

function SuggestionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.searchSuggestionSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SuggestionRow({
  icon,
  iconColor = colors.textSecondary,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.searchSuggestionRow, pressed && styles.searchSuggestionRowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <MaterialCommunityIcons name={icon as never} size={19} color={iconColor} />
      <View style={styles.searchSuggestionCopy}>
        <Text style={styles.searchSuggestionTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.searchSuggestionSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="arrow-top-left" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function productTypeIcon(type: Product['productType']) {
  if (type === 'drone') return 'quadcopter';
  return type === 'accessory' ? 'toolbox-outline' : 'cog-outline';
}

function productTypeLabel(type: Product['productType']) {
  if (type === 'drone') return 'Drones';
  return type === 'accessory' ? 'Accesorios' : 'Repuestos';
}

function productSubtitle(product: Product) {
  const details = [product.brand, product.sku, formatCurrency(product.price, product.currency)];
  if (product.maxFlightMinutes) details.push(`${product.maxFlightMinutes} min`);
  if (product.ratingAverage) details.push(`${product.ratingAverage} ★`);
  details.push(product.stockQuantity > 0 ? 'Disponible' : 'Agotado');
  return details.join(' · ');
}

function normalizeSuggestionText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
