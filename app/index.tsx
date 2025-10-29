import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();

  console.log('Index - isLoading:', isLoading, 'user:', user);

  if (isLoading) {
    return null; // This will show the loading screen from _layout.tsx
  }

  // Redirect to auth if no user, otherwise redirect to tabs
  const redirectTo = user ? "/(tabs)" : "/auth";
  console.log('Index - redirecting to:', redirectTo);
  return <Redirect href={redirectTo} />;
}
