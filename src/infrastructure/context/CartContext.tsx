// Improvement 4

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as Network from 'expo-network';
import type { Product } from '@/domain/entities/Product';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { getDatabase, cacheUserProfile, newCartId, withDatabaseTransaction } from '@/infrastructure/data/sqliteDatabase';
import { getCartFromFirebase, isAuthSessionError, isFirebaseNetworkError, syncCartToFirebase } from '@/infrastructure/data/firebaseDataSync';
import { productRepository } from '@/infrastructure/container';
import { useToast } from '@/infrastructure/context/ToastContext';

interface CartLine { product: Product; quantity: number }
type CartAction = { userId: string; type: 'add'; product: Product } | { userId: string; type: 'remove'; productId: string } | { userId: string; type: 'quantity'; productId: string; quantity: number } | { userId: string; type: 'set'; lines: CartLine[] } | { userId: string; type: 'hydrate'; lines: CartLine[] } | { userId: string; type: 'clear' } | { userId: string; type: 'forget' };

function cartReducer(state: Record<string, CartLine[]>, action: CartAction): Record<string, CartLine[]> {
  if (action.type === 'forget') {
    const remaining = { ...state };
    delete remaining[action.userId];
    return remaining;
  }
  const lines = state[action.userId] ?? [];
  if (action.type === 'set') return { ...state, [action.userId]: action.lines };
  if (action.type === 'hydrate') {
    const current = state[action.userId] ?? [];
    const merged = [...current];
    for (const line of action.lines) {
      if (!merged.some((existing) => existing.product.id === line.product.id)) merged.push(line);
    }
    return { ...state, [action.userId]: merged };
  }
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
  return action.product.isActive && action.product.stockQuantity > 0
    ? { ...state, [action.userId]: [...lines, { product: action.product, quantity: 1 }] }
    : state;
}

interface CartValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addProduct: (product: Product) => boolean;
  removeProduct: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  waitForPendingWrites: () => Promise<void>;
  forgetAccountCart: (userId: string) => void;
}
const CartContext = createContext<CartValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [carts, dispatch] = useReducer(cartReducer, {});
  const [networkRevision, setNetworkRevision] = useState(0);
  const hydratedUsers = useRef(new Set<string>());
  const cloudReadyUsers = useRef(new Set<string>());
  const persistenceQueue = useRef(Promise.resolve());
  const { show } = useToast();
  const lines = useMemo(() => currentUser ? carts[currentUser.id] ?? [] : [], [carts, currentUser]);

  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        setNetworkRevision((revision) => revision + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!currentUser || hydratedUsers.current.has(currentUser.id)) return;
    let active = true;
    void (async () => {
      try {
        const products = await productRepository.listProducts({ page: 1, pageSize: 1000 });
        await cacheUserProfile(currentUser);
        const database = await getDatabase();
        const cart = await database.getFirstAsync<{ id: string; updated_at: string }>(
          'SELECT id, updated_at FROM carts WHERE user_id = ?',
          currentUser.id,
        );
        const localCartUpdatedAt = cart?.updated_at ?? '';
        if (!cart) {
          await database.runAsync(
            'INSERT INTO carts (id, user_id) VALUES (?, ?)',
            newCartId(currentUser.id),
            currentUser.id,
          );
        }
        const rows = await database.getAllAsync<{ product_id: string; quantity: number }>(
          `SELECT ci.product_id, ci.quantity FROM cart_items ci
           JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = ?`,
          currentUser.id,
        );
        const byId = new Map(products.items.map((product) => [product.id, product]));
        let persistedLines = rows.flatMap((row) => {
          const product = byId.get(row.product_id);
          if (!product) return [];
          const quantity = Math.min(row.quantity, product.stockQuantity);
          return quantity > 0 ? [{ product, quantity }] : [];
        });
        try {
          const remoteCart = await getCartFromFirebase(currentUser.id);
          cloudReadyUsers.current.add(currentUser.id);
          const localIsNewer = remoteCart !== null
            && remoteCart.updatedAt !== undefined
            && localCartUpdatedAt !== ''
            && localCartUpdatedAt > remoteCart.updatedAt;
          if (remoteCart && !localIsNewer) {
            persistedLines = remoteCart.items.flatMap(({ productId, quantity }) => {
              const product = byId.get(productId);
              if (!product) return [];
              const safeQuantity = Math.min(quantity, product.stockQuantity);
              return safeQuantity > 0 ? [{ product, quantity: safeQuantity }] : [];
            });
          } else {
            await syncCartToFirebase(currentUser.id, persistedLines.map((line) => ({
              productId: line.product.id,
              quantity: line.quantity,
            })));
          }
          await withDatabaseTransaction(database, async () => {
            const cartId = newCartId(currentUser.id);
            await database.runAsync(
              'INSERT OR IGNORE INTO carts (id, user_id) VALUES (?, ?)',
              cartId,
              currentUser.id,
            );
            const cart = await database.getFirstAsync<{ id: string }>(
              'SELECT id FROM carts WHERE user_id = ?',
              currentUser.id,
            );
            if (!cart) throw new Error('No se pudo restaurar el carrito.');
            await database.runAsync('DELETE FROM cart_items WHERE cart_id = ?', cart.id);
            for (const line of persistedLines) {
              await database.runAsync(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
                cart.id,
                line.product.id,
                line.quantity,
              );
            }
          });
        } catch (error) {
          cloudReadyUsers.current.add(currentUser.id);
          if (active && !isAuthSessionError(error, currentUser.id) && !isFirebaseNetworkError(error)) {
            show('No se pudo sincronizar el carrito; se usará la copia local.', 'info');
          }
        }
        if (!active) return;
        hydratedUsers.current.add(currentUser.id);
        dispatch({ type: 'hydrate', userId: currentUser.id, lines: persistedLines });
      } catch (error) {
        if (active && !isAuthSessionError(error, currentUser.id) && !isFirebaseNetworkError(error)) {
          show('No se pudo cargar el carrito guardado.', 'error');
        }
      }
    })();
    return () => { active = false; };
  }, [currentUser, show]);

  useEffect(() => {
    if (!currentUser || !hydratedUsers.current.has(currentUser.id)
      || !cloudReadyUsers.current.has(currentUser.id)) return;
    const user = currentUser;
    const currentLines = lines;
    persistenceQueue.current = persistenceQueue.current.then(async () => {
      const database = await getDatabase();
      await cacheUserProfile(user);
      await withDatabaseTransaction(database, async () => {
        const cartId = newCartId(user.id);
        await database.runAsync(
          'INSERT OR IGNORE INTO carts (id, user_id) VALUES (?, ?)',
          cartId,
          user.id,
        );
        const cart = await database.getFirstAsync<{ id: string }>(
          'SELECT id FROM carts WHERE user_id = ?',
          user.id,
        );
        if (!cart) throw new Error('No se pudo guardar el carrito.');
        await database.runAsync('DELETE FROM cart_items WHERE cart_id = ?', cart.id);
        for (const line of currentLines) {
          await database.runAsync(
            `INSERT INTO cart_items (cart_id, product_id, quantity)
             VALUES (?, ?, ?)`,
            cart.id,
            line.product.id,
            line.quantity,
          );
        }
        await database.runAsync(
          'UPDATE carts SET updated_at = ? WHERE id = ?',
          new Date().toISOString(),
          cart.id,
        );
      });
      await syncCartToFirebase(user.id, currentLines.map((line) => ({
        productId: line.product.id,
        quantity: line.quantity,
      })));
    }).catch((error: unknown) => {
      if (!isAuthSessionError(error, user.id) && !isFirebaseNetworkError(error)) {
        show('No se pudo guardar el carrito; se usará la copia local.', 'info');
      }
    });
  }, [carts, currentUser, lines, networkRevision, show]);

  const totals = useMemo(() => {
    let itemCount = 0;
    let subtotal = 0;
    for (const line of lines) {
      itemCount += line.quantity;
      subtotal += line.product.price * line.quantity;
    }
    return { itemCount, subtotal };
  }, [lines]);
  const waitForPendingWrites = useCallback(async () => {
    await persistenceQueue.current;
  }, []);
  const forgetAccountCart = useCallback((userId: string) => {
    dispatch({ type: 'forget', userId });
    hydratedUsers.current.delete(userId);
    cloudReadyUsers.current.delete(userId);
  }, []);
  const value = useMemo(() => ({
    lines,
    ...totals,
    waitForPendingWrites,
    forgetAccountCart,
    addProduct: (product: Product) => {
      if (!currentUser || !product.isActive || product.stockQuantity <= 0) return false;
      const existing = lines.find((line) => line.product.id === product.id);
      if (existing && existing.quantity >= product.stockQuantity) return false;
      dispatch({ type: 'add', userId: currentUser.id, product });
      return true;
    },
    removeProduct: (productId: string) => { if (currentUser) dispatch({ type: 'remove', userId: currentUser.id, productId }); },
    setQuantity: (productId: string, quantity: number) => { if (currentUser) dispatch({ type: 'quantity', userId: currentUser.id, productId, quantity }); },
    clearCart: () => { if (currentUser) dispatch({ type: 'clear', userId: currentUser.id }); },
  }), [lines, totals, currentUser, waitForPendingWrites, forgetAccountCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within <CartProvider>.');
  return value;
}
