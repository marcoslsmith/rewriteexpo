import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Use AsyncStorage for all platforms
const storage = {
  getItem: (key: string) => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      manifestations: {
        Row: {
          id: string;
          user_id: string | null;
          original_entry: string;
          transformed_text: string;
          is_favorite: boolean;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          original_entry: string;
          transformed_text: string;
          is_favorite?: boolean;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          original_entry?: string;
          transformed_text?: string;
          is_favorite?: boolean;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      challenges: {
        Row: {
          id: string;
          title: string;
          description: string;
          duration: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          duration: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          duration?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      challenge_progress: {
        Row: {
          id: string;
          user_id: string;
          challenge_id: string;
          current_day: number;
          completed_days: number[];
          responses: Record<string, any>;
          points: number;
          streak: number;
          start_date: string;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          challenge_id: string;
          current_day?: number;
          completed_days?: number[];
          responses?: Record<string, any>;
          points?: number;
          streak?: number;
          start_date?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          challenge_id?: string;
          current_day?: number;
          completed_days?: number[];
          responses?: Record<string, any>;
          points?: number;
          streak?: number;
          start_date?: string;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      notification_schedules: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          use_random_manifestation: boolean;
          time: string;
          days: number[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message?: string;
          use_random_manifestation?: boolean;
          time: string;
          days: number[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          use_random_manifestation?: boolean;
          time?: string;
          days?: number[];
          is_active?: boolean;
          created_at?: string;
        };
      };
    };
  };
};