import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  clearAllAuthData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth state on mount
    const getUser = async () => {
      try {
        console.log('🔍 Checking auth state...');
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.log('❌ Auth error:', error.message);
          setUser(null);
        } else {
          console.log('👤 User found:', user ? user.email : 'null');
          setUser(user);
        }
      } catch (e) {
        console.log('❌ Auth exception:', e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    getUser();

    // Listen for auth changes with more detailed logging
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'null');
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('✅ User signed in:', session?.user?.email);
          setUser(session?.user ?? null);
          break;
        case 'SIGNED_OUT':
          console.log('🚪 User signed out');
          setUser(null);
          break;
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed for:', session?.user?.email);
          setUser(session?.user ?? null);
          break;
        case 'USER_UPDATED':
          console.log('👤 User updated:', session?.user?.email);
          setUser(session?.user ?? null);
          break;
        default:
          console.log('📝 Auth event:', event, session?.user?.email || 'null');
          setUser(session?.user ?? null);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.log('❌ Sign out error:', error);
    }
  };

  const clearAllAuthData = async () => {
    try {
      console.log('🧹 Clearing all auth data...');
      
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
        console.log('🗑️ Clearing auth keys:', authKeys);
        await AsyncStorage.multiRemove(authKeys);
      }
      
      setUser(null);
      console.log('✅ All auth data cleared');
    } catch (error) {
      console.log('❌ Clear auth data error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, clearAllAuthData }}>
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