import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { Product } from '@/domain/entities/Product';
import { useAuth } from '@/infrastructure/context/AuthContext';

interface CartLine { product: Product; quantity: number }
type CartAction = { userId: string; type: 'add'; product: Product } | { userId: string; type: 'remove'; productId: string } | { userId: string; type: 'quantity'; productId: string; quantity: number } | { userId: string; type: 'clear' };

function cartReducer(state: Record<string, CartLine[]>, action: CartAction): Record<string, CartLine[]> {
  const lines = state[action.userId] ?? [];
  if (action.type === 'remove') return { ...state, [action.userId]: lines.filter((line) => line.product.id !== action.productId) };
  if (action.type === 'clear') return { ...state, [action.userId]: [] };
  if (action.type === 'quantity') return { ...state, [action.userId]: lines.flatMap((line) => {
    if (line.product.id !== action.productId) return [line];
    if (action.quantity <= 0) return [];
    const quantity = Math.min(action.quantity, line.product.stockQuantity);
    return quantity > 0 ? [{ ...line, quantity }] : [];
  }) };
  const existing = lines.find((line) => line.product.id === action.product.id);
  if (existing) {
    return { ...state, [action.userId]: lines.flatMap((line) => {
      if (line.product.id !== action.product.id) return [line];
      const quantity = Math.min(line.quantity + 1, line.product.stockQuantity);
      return quantity > 0 ? [{ ...line, quantity }] : [];
    }) };
  }
  return action.product.stockQuantity > 0 ? { ...state, [action.userId]: [...lines, { product: action.product, quantity: 1 }] } : state;
}

interface CartValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addProduct: (product: Product) => boolean;
  removeProduct: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}
const CartContext = createContext<CartValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [carts, dispatch] = useReducer(cartReducer, {});
  const lines = useMemo(() => currentUser ? carts[currentUser.id] ?? [] : [], [carts, currentUser]);
  const value = useMemo(() => ({
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    addProduct: (product: Product) => {
      if (!currentUser || product.stockQuantity <= 0) return false;
      const existing = lines.find((line) => line.product.id === product.id);
      if (existing && existing.quantity >= product.stockQuantity) return false;
      dispatch({ type: 'add', userId: currentUser.id, product });
      return true;
    },
    removeProduct: (productId: string) => { if (currentUser) dispatch({ type: 'remove', userId: currentUser.id, productId }); },
    setQuantity: (productId: string, quantity: number) => { if (currentUser) dispatch({ type: 'quantity', userId: currentUser.id, productId, quantity }); },
    clearCart: () => { if (currentUser) dispatch({ type: 'clear', userId: currentUser.id }); },
  }), [lines, currentUser]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within <CartProvider>.');
  return value;
}
