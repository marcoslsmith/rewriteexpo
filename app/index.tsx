import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, Text } from 'react-native';
import { useEffect, useState } from 'react';

export default function Index() {
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  console.log('🔍 Root Index - user:', user ? user.email : 'null', 'loading:', loading);

  useEffect(() => {
    // If we have a user and we're not already redirecting, trigger redirect
    if (user && !redirecting) {
      console.log('🏠 Root Index - user authenticated, redirecting to main app');
      setRedirecting(true);
    }
  }, [user, redirecting]);

  if (loading) {
    console.log('⏳ Root Index - showing loading screen');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#667eea' }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: '#ffffff', marginTop: 16, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  // Force redirect based on auth state
  if (!user) {
    console.log('🚪 Root Index - redirecting to login (no user)');
    return <Redirect href="/auth/login" />;
  }

  if (redirecting || user) {
    console.log('🏠 Root Index - redirecting to main app (user authenticated)');
    return <Redirect href="/(tabs)" />;
  }

  // Fallback loading state
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#667eea' }}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={{ color: '#ffffff', marginTop: 16, fontSize: 16 }}>Redirecting...</Text>
    </View>
  );
} 