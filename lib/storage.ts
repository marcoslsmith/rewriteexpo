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

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
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
        console.log('Adding challenge progress for user:', user?.id, 'challenge:', progress.challenge_id);
        
        // Check if there's already an in-progress challenge for this user and challenge
        const { data: existingInProgress } = await supabase
          .from('challenge_progress')
          .select('*')
          .eq('user_id', user?.id!)
          .eq('challenge_id', progress.challenge_id)
          .eq('status', 'in_progress')
          .maybeSingle();
        
        if (existingInProgress) {
          console.log('In-progress challenge already exists for user:', user?.id, 'challenge:', progress.challenge_id);
          throw new Error('Challenge already in progress');
        }
        
        // Get the next run number for this user and challenge
        const { data: runNumberData } = await supabase.rpc('get_next_run_number', {
          user_uuid: user?.id!,
          challenge_id_param: progress.challenge_id
        });
        
        const runNumber = runNumberData || 1;
        
        console.log('Inserting new challenge progress...');
        const { error } = await supabase
          .from('challenge_progress')
          .insert({
            ...progress,
            user_id: user?.id!,
            status: 'in_progress',
            run_number: runNumber,
          });
        
        if (error) {
          console.error('Supabase insert error:', error);
          console.warn('Supabase failed, falling back to local storage');
          await this.saveManifestationLocally(manifestation);
          return;
        }
        console.log('Challenge progress inserted successfully');
      } else {
        // Check local storage for existing in-progress challenges
        const allProgress = await this.getChallengeProgress();
        const existingInProgress = allProgress.find(p => 
          p.challenge_id === progress.challenge_id && p.status === 'in_progress'
        );
        
        if (existingInProgress) {
          console.log('In-progress challenge already exists locally for challenge:', progress.challenge_id);
          throw new Error('Challenge already in progress');
        }
        
        // Get next run number for local storage
        const existingRuns = allProgress.filter(p => p.challenge_id === progress.challenge_id);
        const maxRunNumber = Math.max(0, ...existingRuns.map(p => p.run_number || 1));
        const runNumber = maxRunNumber + 1;
        
        // Add new progress to local storage
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
          status: 'in_progress',
          ai_summary: null,
          run_number: runNumber,
        };
        allProgress.push(newProgress);
        await this.saveChallengeProgress(allProgress);
        console.log('Challenge progress saved to local storage');
      }
    } catch (error) {
      console.error('Error adding challenge progress:', error);
      
      throw error;
    }
  },

  // Generate AI summary for completed challenge
  async generateAISummary(progressId: string): Promise<string> {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (!isAuth) {
        throw new Error('Must be authenticated to generate AI summary');
      }

      // Get the challenge progress
      const { data: progress, error: progressError } = await supabase
        .from('challenge_progress')
        .select('*, challenges(*)')
        .eq('id', progressId)
        .single();

      if (progressError || !progress) {
        throw new Error('Challenge progress not found');
      }

      // Build the prompt from user responses
      let userResponses = '';
      const challenge = progress.challenges;
      
      for (let day = 1; day <= challenge.duration; day++) {
        const response = progress.responses[day.toString()];
        if (response) {
          userResponses += `Day ${day}: ${response}\n\n`;
        }
      }

      const summaryPrompt = `Please create a thoughtful, encouraging summary of this user's ${challenge.title} journey. Here are their daily responses:

${userResponses}

Create a 2-3 paragraph summary that highlights their growth, insights, and key themes. Be encouraging and focus on their personal development journey. Keep it personal and meaningful.`;

      // Call the OpenAI edge function
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          prompt: summaryPrompt,
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 300
        }
      });

      if (error) {
        console.error('AI summary generation error:', error);
        throw new Error('Failed to generate AI summary');
      }

      const finalSummary = data?.response || 'Your journey through this challenge shows dedication and growth. Each day brought new insights and progress toward your goals.';

      // Update the challenge progress with the AI summary
      const { error: updateError } = await supabase
        .from('challenge_progress')
        .update({ ai_summary: finalSummary })
        .eq('id', progressId);

      if (updateError) {
        console.error('Error updating AI summary:', updateError);
        throw new Error('Failed to save AI summary');
      }

      return finalSummary;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw error;
    }
  },

  // Complete a challenge and generate AI summary
  async updateChallengeProgressWithCompletion(progressId: string, updates: ChallengeProgressUpdate): Promise<void> {
    try {
      console.log('Updating challenge progress with completion:', progressId, updates);
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        const { error } = await supabase
          .from('challenge_progress')
          .update(updates)
          .eq('id', progressId);
        
        if (error) {
          console.error('Supabase update challenge progress error:', error);
          throw error;
        }
        console.log('Challenge progress updated in Supabase successfully');
      } else {
        // Fallback to local storage
        const allProgress = await this.getChallengeProgress();
        const index = allProgress.findIndex(p => p.id === progressId);
        if (index !== -1) {
          allProgress[index] = { ...allProgress[index], ...updates };
          await this.saveChallengeProgress(allProgress);
          console.log('Challenge progress updated in local storage');
        }
      }
    } catch (error) {
      console.error('Error updating challenge progress with completion:', error);
      throw error;
    }
  },

  // Complete a challenge and generate AI summary
  async completeChallenge(progressId: string): Promise<string> {
    try {
      console.log('Completing challenge with progress ID:', progressId);
      
      // First get the current progress to check its state
      const currentProgress = await this.getChallengeProgress();
      const progress = currentProgress.find(p => p.id === progressId);
      
      if (!progress) {
        throw new Error('Challenge progress not found');
      }
      
      if (progress.status === 'completed') {
        console.log('Challenge already completed, returning existing summary');
        return progress.ai_summary || 'Your journey through this challenge shows dedication and growth. Each day brought new insights and progress toward your goals.';
      }
      
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        console.log('Updating challenge status to completed in Supabase and generating AI summary');
        
        // First update the status to completed
        await this.updateChallengeProgressWithCompletion(progressId, {
          status: 'completed',
          completed_at: new Date().toISOString()
        });
        
        // Then generate AI summary
        let aiSummary: string;
        try {
          aiSummary = await this.generateAISummary(progressId);
          console.log('AI summary generated successfully:', aiSummary);
        } catch (summaryError) {
          console.error('Error generating AI summary, using fallback:', summaryError);
          aiSummary = 'Your journey through this challenge shows dedication and growth. Each day brought new insights and progress toward your goals.';
          // Still update with fallback summary
          await this.updateChallengeProgressWithCompletion(progressId, { ai_summary: aiSummary });
        }
        
        return aiSummary;
      } else {
        console.log('Not authenticated, updating local storage');
        // Local storage fallback
        const allProgress = await this.getChallengeProgress();
        const index = allProgress.findIndex(p => p.id === progressId);
        if (index !== -1) {
          const fallbackSummary = 'Your journey through this challenge shows dedication and growth. Each day brought new insights and progress toward your goals.';
          allProgress[index] = { 
            ...allProgress[index], 
            status: 'completed',
            completed_at: new Date().toISOString(),
            ai_summary: fallbackSummary
          };
          await this.saveChallengeProgress(allProgress);
          return fallbackSummary;
        }
        console.error('Challenge progress not found in local storage');
        throw new Error('Challenge progress not found');
      }
    } catch (error) {
      console.error('Error completing challenge:', error);
      throw error;
    }
  },

  async updateChallengeProgress(id: string, updates: ChallengeProgressUpdate): Promise<void> {
    try {
      console.log('Updating challenge progress:', id, 'with updates:', updates);
      const isAuth = await this.isAuthenticated();
      
      // Ensure we don't accidentally overwrite important fields
      const safeUpdates = { ...updates };
      
      if (isAuth) {
        const { error } = await supabase
          .from('challenge_progress')
          .update(safeUpdates)
          .eq('id', id);
        
        if (error) {
          console.error('Supabase update challenge progress error:', error);
          throw updateError;
        }
        console.log('Challenge progress updated in Supabase successfully');
      } else {
        // Local storage fallback
        const allProgress = await this.getChallengeProgress();
        const index = allProgress.findIndex(p => p.id === id);
        if (index !== -1) {
          allProgress[index] = { ...allProgress[index], ...safeUpdates };
          await this.saveChallengeProgress(allProgress);
          console.log('Challenge progress updated in local storage');
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
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user ID:', user?.id);
        
        const { data, error } = await supabase
          .from('notification_schedules')
          .select('*')
          .eq('user_id', user?.id)
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
        console.log('Raw Supabase data:', data);
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
        console.log('Schedule data being inserted:', {
          ...schedule,
          user_id: user?.id,
        });
        
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
          console.error('Error details:', error.details, error.hint, error.code);
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

  // Helper function to force create default schedules (for debugging)
  async createDefaultSchedulesForCurrentUser(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    console.log('Force creating default schedules for user:', user.id);
    
    try {
      // Use the database function to force create schedules
      const { error } = await supabase.rpc('force_create_default_schedules_for_user', {
        user_uuid: user.id
      });
      
      if (error) {
        console.error('Error calling force_create_default_schedules_for_user:', error);
        // Fallback to manual creation
        await this.createSchedulesManually(user.id);
      } else {
        console.log('Successfully called database function to create default schedules');
      }
    } catch (error) {
      console.error('Error with database function, falling back to manual creation:', error);
      await this.createSchedulesManually(user.id);
    }
    
    console.log('Default schedules created successfully');
  },

  // Manual schedule creation as fallback
  async createSchedulesManually(userId: string): Promise<void> {
    console.log('Creating schedules manually for user:', userId);
    
    // Create morning motivation schedule
    await this.addNotificationSchedule({
      user_id: userId,
      title: 'Good Morning Motivation',
      message: 'Good morning! Start your day with intention. What will you manifest today?',
      use_random_manifestation: false,
      time: '08:00',
      days: [1, 2, 3, 4, 5], // Monday to Friday
      is_active: true,
    });
    
    // Create evening reflection schedule
    await this.addNotificationSchedule({
      user_id: userId,
      title: 'Evening Reflection',
      message: 'Time to wind down and reflect on your day. What went well?',
      use_random_manifestation: false,
      time: '20:00',
      days: [0, 1, 2, 3, 4, 5, 6], // Every day
      is_active: true,
    });
    
    console.log('Manual schedule creation completed');
  },

  // Debug function to check database directly
  async debugNotificationSchedules(): Promise<any> {
    const user = await this.getCurrentUser();
    if (!user) {
      console.log('No authenticated user for debug');
      return null;
    }

    try {
      console.log('=== DEBUG: Checking notification schedules ===');
      console.log('User ID:', user.id);
      console.log('User Email:', user.email);
      
      // Direct query to check what's in the database
      const { data, error } = await supabase
        .from('notification_schedules')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('Direct DB query result:', { data, error });
      
      if (error) {
        console.error('Direct DB query error:', error);
        return { error, data: null };
      }
      
      console.log('Found schedules in DB:', data?.length || 0);
      if (data) {
        data.forEach((schedule, index) => {
          console.log(`Schedule ${index + 1}:`, {
            id: schedule.id,
            title: schedule.title,
            time: schedule.time,
            days: schedule.days,
            is_active: schedule.is_active,
            created_at: schedule.created_at
          });
        });
      }
      
      // Also check using the debug function
      try {
        const { data: debugData, error: debugError } = await supabase.rpc('check_user_schedules', {
          user_email_param: user.email
        });
        
        console.log('Debug function result:', { debugData, debugError });
      } catch (debugErr) {
        console.log('Debug function not available or failed:', debugErr);
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('Debug function failed:', err);
      return { error: err, data: null };
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