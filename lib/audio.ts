import { supabase } from './supabase';
import type { Database } from './supabase';

type AudioSession = Database['public']['Tables']['audio_sessions']['Row'];
type AudioFile = Database['public']['Tables']['audio_files']['Row'];

interface GenerateAudioParams {
  manifestationTexts: string[];
  duration: number; // in minutes
  musicStyle: string;
}

interface AudioCache {
  [key: string]: string; // manifestation text -> audio URL
}

export const audioService = {
  // Cache for storing generated audio URLs
  audioCache: {} as AudioCache, // In-memory cache as fallback

  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string> {
    const { manifestationTexts, duration, musicStyle } = params;
    
    try {
      console.log('Starting audio generation with params:', {
        textCount: manifestationTexts.length,
        duration,
        musicStyle
      });

      // Create audio session record
      const sessionId = await this.createAudioSession(params);
      
      // Step 1: Check cache and generate TTS for each manifestation
      const audioUrls: string[] = [];
      
      for (const text of manifestationTexts) {
        // Check database cache first
        const cachedAudio = await this.getCachedAudioFile(text);
        
        if (cachedAudio) {
          console.log('Using cached audio from database for:', text.substring(0, 50) + '...');
          audioUrls.push(cachedAudio);
        } else {
          console.log('Generating new audio for:', text.substring(0, 50) + '...');
          const audioUrl = await this.generateTTSAudio(text);
          
          // Save to database cache
          await this.saveAudioFileCache(text, audioUrl);
          
          // Also save to in-memory cache as fallback
          const cacheKey = this.getCacheKey(text);
          this.audioCache[cacheKey] = audioUrl;
          audioUrls.push(audioUrl);
        }
      }

      // Step 2: Combine audio clips to match desired duration
      console.log(`Combining ${audioUrls.length} audio clips for ${duration} minutes`);
      const combinedAudioUrl = await this.combineAudioClips(audioUrls, duration);

      // Step 3: Add background music
      console.log(`Adding ${musicStyle} background music`);
      const finalAudioUrl = await this.addBackgroundMusic(combinedAudioUrl, musicStyle);

      // Update session with final audio URL
      await this.updateAudioSession(sessionId, 'completed', finalAudioUrl);

      console.log('Audio generation completed successfully');
      return finalAudioUrl;
    } catch (error) {
      console.error('Error generating personalized audio:', error);
      
      // If we have a session ID, mark it as failed
      // Note: sessionId might not be available if creation failed
      
      throw new Error('Failed to generate personalized audio');
    }
  },

  async createAudioSession(params: GenerateAudioParams): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_audio_session', {
        p_title: `Audio Session - ${new Date().toLocaleDateString()}`,
        p_manifestation_ids: [], // We'll need manifestation IDs for this
        p_duration_minutes: params.duration,
        p_music_style: params.musicStyle
      });

      if (error) {
        console.error('Error creating audio session:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create audio session:', error);
      // Return a temporary ID so the process can continue
      return `temp_${Date.now()}`;
    }
  },

  async updateAudioSession(sessionId: string, status: string, audioUrl?: string): Promise<void> {
    try {
      if (sessionId.startsWith('temp_')) {
        console.log('Skipping update for temporary session ID');
        return;
      }

      const { error } = await supabase.rpc('update_audio_session_status', {
        p_session_id: sessionId,
        p_status: status,
        p_audio_url: audioUrl || null
      });

      if (error) {
        console.error('Error updating audio session:', error);
      }
    } catch (error) {
      console.error('Failed to update audio session:', error);
    }
  },

  async getCachedAudioFile(text: string): Promise<string | null> {
    try {
      // Generate the same hash for lookup
      const textHash = this.generateTextHash(text);
      
      const { data, error } = await supabase.rpc('get_cached_audio_file', {
        p_text_hash: textHash,
        p_voice_model: 'nova',
        p_tts_model: 'tts-1'
      });

      if (error) {
        console.error('Error checking audio cache:', error);
        return null;
      }

      if (data && data.length > 0) {
        return data[0].audio_url;
      }

      return null;
    } catch (error) {
      console.error('Failed to check audio cache:', error);
      return null;
    }
  },

  async saveAudioFileCache(text: string, audioUrl: string): Promise<void> {
    try {
      // Generate a consistent hash for the text
      const textHash = this.generateTextHash(text);
      
      const { error } = await supabase.rpc('save_audio_file_cache', {
        p_text_hash: textHash,
        p_audio_url: audioUrl,
        p_manifestation_id: null, // We'll need to get this from the manifestation
        p_file_size: null,
        p_voice_model: 'nova',
        p_tts_model: 'tts-1'
      });

      if (error) {
        console.error('Error saving audio to cache:', error);
      }
    } catch (error) {
      console.error('Failed to save audio to cache:', error);
    }
  },

  generateTextHash(text: string): string {
    // Create a consistent hash of the text for caching
    // Using a simple base64 encoding with cleanup for database compatibility
    return btoa(text).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
  },

  getCacheKey(text: string): string {
    // Create a simple hash of the text for caching
    return btoa(text).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  },

  async generateTTSAudio(text: string): Promise<string> {
    try {
      // Call OpenAI TTS API via Supabase Edge Function
      console.log('Generating TTS for text:', text.substring(0, 100) + '...');
      
      const { data, error } = await supabase.functions.invoke('openai-tts', {
        body: {
          text: text,
          voice: 'nova', // Clear, calm voice
          model: 'tts-1',
          response_format: 'mp3'
        }
      });

      if (error) {
        console.error('TTS generation error details:', {
          message: error.message,
          details: error.details,
          context: error.context
        });
        throw new Error(`Failed to generate speech audio: ${error.message}`);
      }

      if (data?.audioUrl || data?.audioData) {
        console.log('TTS generation successful, audio received');
        
        // If we have audioUrl, use it directly
        if (data.audioUrl) {
          return data.audioUrl;
        }
        
        // If we have audioData, it's base64 encoded
        if (data.audioData) {
          return `data:audio/mpeg;base64,${data.audioData}`;
        }
      }

      console.error('No audio URL in response:', data);
      throw new Error(`No audio URL returned from TTS service. Response: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('TTS generation failed:', error);
      
      // For development, return a placeholder, but in production we should handle this better
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using placeholder audio due to TTS failure');
        return this.getBackgroundMusicUrl('meditation');
      }
      
      // Re-throw the error in production so the UI can handle it appropriately
      throw error;
    }
  },

  async combineAudioClips(audioUrls: string[], targetDurationMinutes: number): Promise<string> {
    try {
      // For now, return the first audio URL as a placeholder
      // In a real implementation, this would:
      // 1. Download all audio clips
      // 2. Loop/repeat them to fill the target duration
      // 3. Combine them into a single audio file
      // 4. Upload to Supabase Storage
      // 5. Return the public URL
      
      console.log(`Combining ${audioUrls.length} audio clips for ${targetDurationMinutes} minutes`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Return the first audio URL or a fallback
      return audioUrls[0] || this.getBackgroundMusicUrl('meditation');
    } catch (error) {
      console.error('Error combining audio clips:', error);
      throw new Error('Failed to combine audio clips');
    }
  },

  async addBackgroundMusic(voiceAudioUrl: string, musicStyle: string): Promise<string> {
    try {
      // For now, return the voice audio URL as a placeholder
      // In a real implementation, this would:
      // 1. Download the voice audio
      // 2. Get the appropriate background music track from Supabase Storage
      // 3. Mix them together with proper volume levels
      // 4. Upload the final mixed audio to Supabase Storage
      // 5. Return the public URL
      
      console.log(`Adding ${musicStyle} background music to audio`);
      
      // Get the background music URL from Supabase Storage
      const backgroundMusicUrl = this.getBackgroundMusicUrl(musicStyle);
      console.log(`Background music URL: ${backgroundMusicUrl}`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For now, return the voice audio URL
      // In production, this would be the mixed audio
      return voiceAudioUrl;
    } catch (error) {
      console.error('Error adding background music:', error);
      throw new Error('Failed to add background music');
    }
  },

  getBackgroundMusicUrl(musicStyle: string): string {
    // Get the public URL for background music files from Supabase Storage
    const musicFiles = {
      'nature': 'nature_sounds.mp3',
      'meditation': 'meditation_bells.mp3',
      'ambient': 'ambient_waves.mp3'
    };

    const filename = musicFiles[musicStyle as keyof typeof musicFiles] || musicFiles.meditation;
    
    // Get public URL from Supabase Storage
    const { data } = supabase.storage
      .from('audio-files')
      .getPublicUrl(filename);

    return data.publicUrl;
  },

  async uploadToStorage(audioBlob: Blob, filename: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(`generated/${filename}`, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading to storage:', error);
      throw new Error('Failed to upload audio file');
    }
  },

  // Clear cache (useful for development/testing)
  clearCache(): void {
    this.audioCache = {};
    console.log('Audio cache cleared');
  },

  // Get cache statistics
  getCacheStats(): { totalCached: number; cacheKeys: string[] } {
    const cacheKeys = Object.keys(this.audioCache);
    return {
      totalCached: cacheKeys.length,
      cacheKeys
    };
  },

  // Get user's audio session history
  async getAudioSessions(limit: number = 10): Promise<AudioSession[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_audio_sessions', {
        p_limit: limit
      });

      if (error) {
        console.error('Error fetching audio sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch audio sessions:', error);
      return [];
    }
  },

  // Upload audio file to Supabase Storage
  async uploadAudioFile(audioBlob: Blob, filename: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const filePath = `${user.id}/${filename}`;
      
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(filePath, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading audio file:', error);
      throw new Error('Failed to upload audio file');
    }
  }
};