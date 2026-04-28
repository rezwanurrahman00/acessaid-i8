import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // This will show the loading screen from _layout.tsx
  }

  const redirectTo = user ? "/(tabs)" : "/auth";
  return <Redirect href={redirectTo} />;
}
