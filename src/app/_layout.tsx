import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ToastProvider } from '@/infrastructure/context/ToastContext';
import { AuthProvider, useAuth } from '@/infrastructure/context/AuthContext';
import { ToastHost } from '@/presentation/components/ToastHost';
import { CartProvider } from '@/infrastructure/context/CartContext';
import { OrderProvider } from '@/infrastructure/context/OrderContext';
import { colors } from '@/shared/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function SplashGate() {
  const { isInitializing } = useAuth();
  useEffect(() => {
    if (!isInitializing) void SplashScreen.hideAsync().catch(() => {});
  }, [isInitializing]);
  return null;
}

export default function RootLayout() {
    return (
        <ToastProvider>
            <AuthProvider>
                <SplashGate />
                <CartProvider>
                    <OrderProvider>
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                animation: 'fade',
                                contentStyle: { backgroundColor: colors.background },
                            }}
                        />
                        <ToastHost />
                    </OrderProvider>
                </CartProvider>
            </AuthProvider>
        </ToastProvider>
    );
}
