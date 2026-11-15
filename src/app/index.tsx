import { useCallback, useState } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { BrandIntro } from '@/presentation/components/BrandIntro';
import { colors } from '@/shared/theme';

export default function Index() {
  const { currentUser, isInitializing } = useAuth();
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  if (isInitializing) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (!introDone) {
    return <BrandIntro onDone={finishIntro} />;
  }
  return <Redirect href={(currentUser ? '/home' : '/login') as never} />;
}
