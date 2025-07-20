import { Stack } from 'expo-router';

export default function AppNavigator() {
  console.log('🏠 AppNavigator - rendering main app navigation');
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
} 