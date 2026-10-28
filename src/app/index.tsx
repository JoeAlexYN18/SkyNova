import { Redirect } from 'expo-router';
import { useAuth } from '@/infrastructure/context/AuthContext';

export default function Index() {
  const { currentUser } = useAuth();
  return <Redirect href={(currentUser ? '/home' : '/login') as never} />;
}
