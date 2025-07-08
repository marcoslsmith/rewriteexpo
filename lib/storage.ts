import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Database } from './supabase';

type Manifestation = Database['public']['Tables']['manifestations']['Row'];
type ManifestationInsert = Database['public']['Tables']['manifestations']['Insert'];
type ManifestationUpdate = Database['public']['Tables']['manifestations']['Update'];

type ChallengeProgress = Database['public']['Tables']['challenge_progress']['Row'];
type ChallengeProgressInsert = Database['public']['Tables']['challenge_progress']['Insert'];
type ChallengeProgressUpdate = Database['public']['Tables']['challenge_progress']['Update'];

type NotificationSchedule = Database['public']['Tables']['notification_schedules']['Row'];
type NotificationScheduleInsert = Database['public']['Tables']['notification_schedules']['Insert'];
type NotificationScheduleUpdate = Database['public']['Tables']['notification_schedules']['Update'];

const STORAGE_KEYS = {
  MANIFESTATIONS: '@rewrite_manifestations',
  NOTIFICATIONS: '@rewrite_notifications',
  CHALLENGES: '@rewrite_challenges',
  USER_PREFERENCES: '@rewrite_preferences',
};

export const storageService = {
  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  },

  // Manifestations
  async getManifestations(): Promise<Manifestation[]> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        console.log('Authenticated user, fetching from Supabase...');
        const { data, error } = await supabase
          .from('manifestations')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        console.log('Supabase data loaded:', data?.length || 0, 'manifestations');
        return data || [];
      } else {
        console.log('Not authenticated, using local storage...');
        // Fallback to local storage
        const data = await AsyncStorage.getItem(STORAGE_KEYS.MANIFESTATIONS);
        const parsed = data ? JSON.parse(data) : [];
        console.log('Local storage data loaded:', parsed.length, 'manifestations');
        return parsed;
      }
    } catch (error) {
      console.error('Error loading manifestations:', error);
      console.log('Falling back to local storage due to error...');
      // Fallback to local storage
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MANIFESTATIONS);
      return data ? JSON.parse(data) : [];
    }
  },

  async saveManifestations(manifestations: Manifestation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MANIFESTATIONS, JSON.stringify(manifestations));
    } catch (error) {
      console.error('Error saving manifestations locally:', error);
    }
  },

  async addManifestation(manifestation: ManifestationInsert): Promise<void> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn('User not found, falling back to local storage');
          await this.saveManifestationLocally(manifestation);
          return;
        }
        
        const { error } = await supabase
          .from('manifestations')
          .insert({
            ...manifestation,
            user_id: user?.id,
          });
        
        if (error) {
          console.error('Supabase insert error:', error);
          console.warn('Supabase failed, falling back to local storage');
          await this.saveManifestationLocally(manifestation);
          return;
        }
        
        // Also save locally as backup
        await this.saveManifestationLocally(manifestation);
      } else {
        await this.saveManifestationLocally(manifestation);
      }
    } catch (error) {
      console.error('Error adding manifestation:', error);
      // Final fallback to local storage
      try {
        await this.saveManifestationLocally(manifestation);
        console.log('Manifestation saved to local storage as fallback');
      } catch (localError) {
        console.error('Failed to save to local storage:', localError);
        throw new Error('Failed to save manifestation to both remote and local storage');
      }
    }
  },

  async saveManifestationLocally(manifestation: ManifestationInsert): Promise<void> {
    const manifestations = await this.getManifestations();
    const newManifestation: Manifestation = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: null,
      original_entry: manifestation.original_entry,
      transformed_text: manifestation.transformed_text,
      is_favorite: manifestation.is_favorite || false,
      tags: manifestation.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    manifestations.unshift(newManifestation); // Add to beginning for newest first
    await this.saveManifestations(manifestations);
    console.log('Manifestation saved locally:', newManifestation.id);
  },
  async updateManifestation(id: string, updates: ManifestationUpdate): Promise<void> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        const { error } = await supabase
          .from('manifestations')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
      } else {
        // Fallback to local storage
        const manifestations = await this.getManifestations();
        const index = manifestations.findIndex(m => m.id === id);
        if (index !== -1) {
          manifestations[index] = { 
            ...manifestations[index], 
            ...updates, 
            updated_at: new Date().toISOString() 
          };
          await this.saveManifestations(manifestations);
        }
      }
    } catch (error) {
      console.error('Error updating manifestation:', error);
      throw error;
    }
  },

  async deleteManifestation(id: string): Promise<void> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        const { error } = await supabase
          .from('manifestations')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } else {
        // Fallback to local storage
        const manifestations = await this.getManifestations();
        const filtered = manifestations.filter(m => m.id !== id);
        await this.saveManifestations(filtered);
      }
    } catch (error) {
      console.error('Error deleting manifestation:', error);
      throw error;
    }
  },

  // Challenge Progress
  async getChallengeProgress(): Promise<ChallengeProgress[]> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        console.log('Fetching challenge progress from Supabase...');
        const { data, error } = await supabase
          .from('challenge_progress')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Supabase challenge progress error:', error);
          throw error;
        }
        console.log('Challenge progress loaded:', data?.length || 0, 'entries');
        return data || [];
      } else {
        console.log('Using local storage for challenge progress...');
        // Fallback to local storage
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CHALLENGES);
        const parsed = data ? JSON.parse(data) : [];
        console.log('Local challenge progress loaded:', parsed.length, 'entries');
        return parsed;
      }
    } catch (error) {
      console.error('Error loading challenge progress:', error);
      console.log('Falling back to local storage for challenges...');
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHALLENGES);
      return data ? JSON.parse(data) : [];
    }
  },

  async saveChallengeProgress(progress: ChallengeProgress[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving challenge progress locally:', error);
    }
  },

  async addChallengeProgress(progress: ChallengeProgressInsert): Promise<void> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('challenge_progress')
          .insert({
            ...progress,
            user_id: user?.id!,
          });
        
        if (error) throw error;
      } else {
        // Fallback to local storage
        const allProgress = await this.getChallengeProgress();
        const newProgress: ChallengeProgress = {
          id: Date.now().toString(),
          user_id: 'local',
          challenge_id: progress.challenge_id,
          current_day: progress.current_day || 1,
          completed_days: progress.completed_days || [],
          responses: progress.responses || {},
          points: progress.points || 0,
          streak: progress.streak || 0,
          start_date: progress.start_date || new Date().toISOString(),
          completed_at: progress.completed_at || null,
          created_at: new Date().toISOString(),
        };
        allProgress.push(newProgress);
        await this.saveChallengeProgress(allProgress);
      }
    } catch (error) {
      console.error('Error adding challenge progress:', error);
      throw error;
    }
  },

  async updateChallengeProgress(id: string, updates: ChallengeProgressUpdate): Promise<void> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        const { error } = await supabase
          .from('challenge_progress')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
      } else {
        // Fallback to local storage
        const allProgress = await this.getChallengeProgress();
        const index = allProgress.findIndex(p => p.id === id);
        if (index !== -1) {
          allProgress[index] = { ...allProgress[index], ...updates };
          await this.saveChallengeProgress(allProgress);
        }
      }
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      throw error;
    }
  },

  // Notification Schedules
  async getNotificationSchedules(): Promise<NotificationSchedule[]> {
    try {
      const isAuth = await this.isAuthenticated();
      console.log('Getting notification schedules, authenticated:', isAuth);
      
      if (isAuth) {
        console.log('Fetching notification schedules from Supabase...');
        const { data, error } = await supabase
          .from('notification_schedules')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Supabase notification schedules error:', error);
          console.log('Falling back to local storage due to Supabase error...');
          // Fallback to local storage instead of throwing
          const localData = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
          const parsed = localData ? JSON.parse(localData) : [];
          console.log('Local notification schedules loaded as fallback:', parsed.length, 'schedules');
          return parsed;
        }
        console.log('Notification schedules from Supabase:', data?.length || 0, 'schedules');
        return data || [];
      } else {
        console.log('Not authenticated, using local storage for notification schedules...');
        // Fallback to local storage
        const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        const parsed = data ? JSON.parse(data) : [];
        console.log('Local notification schedules loaded:', parsed.length, 'schedules');
        return parsed;
      }
    } catch (error) {
      console.error('Error loading notification schedules:', error);
      console.log('Falling back to local storage for notification schedules...');
      const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : [];
    }
  },

  async saveNotificationSchedules(schedules: NotificationSchedule[]): Promise<void> {
    try {
      console.log('Saving notification schedules to local storage:', schedules.length, 'schedules');
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(schedules));
    } catch (error) {
      console.error('Error saving notification schedules locally:', error);
    }
  },

  async addNotificationSchedule(schedule: NotificationScheduleInsert): Promise<void> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Adding notification schedule to Supabase for user:', user?.id);
        
        if (!user) {
          console.log('No user found, saving to local storage instead');
          await this.saveNotificationScheduleLocally(schedule);
          return;
        }
        
        const { error } = await supabase
          .from('notification_schedules')
          .insert({
            ...schedule,
            user_id: user?.id!,
          });
        
        if (error) {
          console.error('Supabase insert notification schedule error:', error);
          console.log('Supabase failed, falling back to local storage');
          await this.saveNotificationScheduleLocally(schedule);
          return;
        }
        console.log('Notification schedule added to Supabase successfully');
        
        // Also save to local storage as backup
        await this.saveNotificationScheduleLocally(schedule);
      } else {
        console.log('Not authenticated, saving notification schedule to local storage...');
        await this.saveNotificationScheduleLocally(schedule);
      }
    } catch (error) {
      console.error('Error adding notification schedule:', error);
      throw error;
    }
  },

  async saveNotificationScheduleLocally(schedule: NotificationScheduleInsert): Promise<void> {
    const schedules = await this.getNotificationSchedules();
    const newSchedule: NotificationSchedule = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: schedule.user_id || 'local',
      title: schedule.title,
      message: schedule.message || '',
      use_random_manifestation: schedule.use_random_manifestation !== false,
      time: schedule.time,
      days: schedule.days,
      is_active: schedule.is_active !== false,
      created_at: new Date().toISOString(),
    };
    schedules.push(newSchedule);
    await this.saveNotificationSchedules(schedules);
    console.log('Notification schedule saved to local storage:', newSchedule.id);
  },
  async updateNotificationSchedule(id: string, updates: NotificationScheduleUpdate): Promise<void> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        console.log('Updating notification schedule in Supabase:', id);
        const { error } = await supabase
          .from('notification_schedules')
          .update(updates)
          .eq('id', id);
        
        if (error) {
          console.error('Supabase update notification schedule error:', error);
          console.log('Supabase update failed, trying local storage...');
          // Try local storage update as fallback
          const schedules = await this.getNotificationSchedules();
          const index = schedules.findIndex(s => s.id === id);
          if (index !== -1) {
            schedules[index] = { ...schedules[index], ...updates };
            await this.saveNotificationSchedules(schedules);
            console.log('Notification schedule updated in local storage as fallback');
          }
          return;
        }
        console.log('Notification schedule updated in Supabase successfully');
      } else {
        console.log('Not authenticated, updating notification schedule in local storage...');
        // Fallback to local storage
        const schedules = await this.getNotificationSchedules();
        const index = schedules.findIndex(s => s.id === id);
        if (index !== -1) {
          schedules[index] = { ...schedules[index], ...updates };
          await this.saveNotificationSchedules(schedules);
          console.log('Notification schedule updated in local storage');
        }
      }
    } catch (error) {
      console.error('Error updating notification schedule:', error);
      throw error;
    }
  },

  async deleteNotificationSchedule(id: string): Promise<void> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        console.log('Deleting notification schedule from Supabase:', id);
        const { error } = await supabase
          .from('notification_schedules')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('Supabase delete notification schedule error:', error);
          console.log('Supabase delete failed, trying local storage...');
          // Try local storage delete as fallback
          const schedules = await this.getNotificationSchedules();
          const filtered = schedules.filter(s => s.id !== id);
          await this.saveNotificationSchedules(filtered);
          console.log('Notification schedule deleted from local storage as fallback');
          return;
        }
        console.log('Notification schedule deleted from Supabase successfully');
      } else {
        console.log('Not authenticated, deleting notification schedule from local storage...');
        // Fallback to local storage
        const schedules = await this.getNotificationSchedules();
        const filtered = schedules.filter(s => s.id !== id);
        await this.saveNotificationSchedules(filtered);
        console.log('Notification schedule deleted from local storage');
      }
    } catch (error) {
      console.error('Error deleting notification schedule:', error);
      throw error;
    }
  },

  // Clear all data
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      
      const isAuth = await this.isAuthenticated();
      if (isAuth) {
        // Clear user data from Supabase
        await supabase.from('manifestations').delete().neq('id', '');
        await supabase.from('challenge_progress').delete().neq('id', '');
        await supabase.from('notification_schedules').delete().neq('id', '');
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  },
};