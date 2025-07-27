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
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          setUser(null);
        } else {
          setUser(user);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    getUser();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          setUser(session?.user ?? null);
          break;
        case 'SIGNED_OUT':
          setUser(null);
          break;
        case 'TOKEN_REFRESHED':
          setUser(session?.user ?? null);
          break;
        case 'USER_UPDATED':
          setUser(session?.user ?? null);
          break;
        default:
          setUser(session?.user ?? null);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
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