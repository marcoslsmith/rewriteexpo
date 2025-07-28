import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  clearAllAuthData: () => Promise<void>;
  refreshSession: () => Promise<void>;
  debugSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Enhanced session refresh function
  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        setUser(null);
      } else if (session?.user) {
        setUser(session.user);
        // Ensure session is persisted
        await AsyncStorage.setItem('supabase.auth.token', JSON.stringify(session));
      }
    } catch (error) {
      setUser(null);
    }
  };

  // Session recovery function
  const recoverSession = async () => {
    try {
      // Try to get stored session first
      const storedSession = await AsyncStorage.getItem('supabase.auth.token');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session?.user) {
          setUser(session.user);
          return;
        }
      }
      
      // Fallback to Supabase session check
      await refreshSession();
    } catch (error) {
      setUser(null);
    }
  };

  useEffect(() => {
    // Check auth state on mount with session recovery
    const getUser = async () => {
      try {
        await recoverSession();
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    getUser();

    // Listen for auth changes with enhanced handling
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          setUser(session?.user ?? null);
          break;
        case 'SIGNED_OUT':
          setUser(null);
          break;
        case 'TOKEN_REFRESHED':
          setUser(session?.user ?? null);
          // Ensure session is persisted
          if (session) {
            await AsyncStorage.setItem('supabase.auth.token', JSON.stringify(session));
          }
          break;
        case 'USER_UPDATED':
          setUser(session?.user ?? null);
          break;
        default:
          setUser(session?.user ?? null);
      }
    });

    // Handle app state changes (background/foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, refresh session
        refreshSession();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up periodic session refresh (every 30 minutes)
    const sessionRefreshInterval = setInterval(() => {
      refreshSession();
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      listener?.subscription.unsubscribe();
      appStateSubscription?.remove();
      clearInterval(sessionRefreshInterval);
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      // Sign out error handled silently
    }
  };

  const clearAllAuthData = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all AsyncStorage keys that might contain auth data
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => 
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('session') ||
        key.includes('token')
      );
      
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
      }
      
      setUser(null);
    } catch (error) {
      // Clear auth data error handled silently
    }
  };

  // Debug session function (temporary for testing)
  const debugSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const storedSession = await AsyncStorage.getItem('supabase.auth.token');
      
      console.log('=== Session Debug ===');
      console.log('Current user:', user?.email);
      console.log('Supabase session:', session ? 'Valid' : 'None');
      console.log('Stored session:', storedSession ? 'Exists' : 'None');
      console.log('Session expiry:', session?.expires_at);
      console.log('===================');
    } catch (error) {
      console.log('Session debug error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, clearAllAuthData, refreshSession, debugSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 