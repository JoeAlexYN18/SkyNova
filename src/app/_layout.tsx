import { Stack } from 'expo-router';

import { ToastProvider } from '@/infrastructure/context/ToastContext';
import { AuthProvider } from '@/infrastructure/context/AuthContext';
import { ToastHost } from '@/presentation/components/ToastHost';
import { CartProvider } from '@/infrastructure/context/CartContext';
import { OrderProvider } from '@/infrastructure/context/OrderContext';

export default function RootLayout() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <OrderProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <ToastHost />
          </OrderProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
