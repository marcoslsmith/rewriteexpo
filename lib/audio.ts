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

      // Step 2: Create looped sequence to match desired duration
      console.log(`Creating looped sequence from ${audioUrls.length} audio clips for ${duration} minutes`);
      const loopedSequenceUrl = await this.createLoopedSequence(audioUrls, duration);

      // Step 3: Add looping background music
      console.log(`Adding ${musicStyle} background music`);
      const finalAudioUrl = await this.addLoopingBackgroundMusic(loopedSequenceUrl, musicStyle, duration);

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
      console.log('Generating TTS for text:', text.substring(0, 50) + '...');
      console.log('Calling Supabase Edge Function: openai-tts');
      
      const { data, error } = await supabase.functions.invoke('openai-tts', {
        body: {
          text: text,
          voice: 'nova', // Clear, calm voice
          model: 'tts-1',
          response_format: 'mp3'
        }
      });

      if (error) {
        console.error('Edge Function invocation error:', error);
        
        // Check if it's a network/connection error
        if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
          throw new Error('Network error: Unable to connect to the TTS service. Please check your internet connection and try again.');
        }
        
        // Check if it's an authentication error
        if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
          throw new Error('Authentication error: Please check that the OpenAI API key is properly configured in Supabase Edge Function secrets.');
        }
        
        // Check if it's a rate limit error
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          throw new Error('Rate limit exceeded: Please wait a moment before trying again.');
        }
        
        throw new Error(`TTS service error: ${error.message || 'Unknown error occurred'}`);
      }

      console.log('Edge Function response received:', {
        hasData: !!data,
        hasAudioUrl: !!data?.audioUrl,
        hasAudioData: !!data?.audioData,
        success: data?.success,
        dataKeys: data ? Object.keys(data) : []
      });

      if (data?.success && (data?.audioUrl || data?.audioData)) {
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

      console.error('Invalid response from TTS service:', {
        data,
        hasSuccess: !!data?.success,
        hasAudioUrl: !!data?.audioUrl,
        hasAudioData: !!data?.audioData
      });
      
      // Check if there's an error in the response
      if (data?.error) {
        throw new Error(`TTS service error: ${data.error} (${data.code || 'UNKNOWN_CODE'})`);
      }
      
      throw new Error('Invalid response from TTS service: No audio data received');
    } catch (error) {
      console.error('TTS generation failed:', error);
      
      // Provide more helpful error messages
      if (error instanceof Error) {
        // If it's already a well-formatted error, re-throw it
        if (error.message.includes('TTS service error') || 
            error.message.includes('Network error') || 
            error.message.includes('Authentication error') ||
            error.message.includes('Rate limit exceeded')) {
          throw error;
        }
      }
      
      // For any other errors, provide a generic but helpful message
      throw new Error('Failed to generate speech audio. Please check your connection and try again.');
    }
  },

  async createLoopedSequence(audioUrls: string[], targetDurationMinutes: number): Promise<string> {
    try {
      const targetDurationSeconds = targetDurationMinutes * 60;
      console.log(`Creating looped sequence for ${targetDurationSeconds} seconds`);
      
      // Calculate how many times we need to loop the sequence
      // Assume each TTS clip is approximately 10-15 seconds
      const estimatedClipDuration = 12; // seconds per manifestation
      const totalSequenceDuration = audioUrls.length * estimatedClipDuration;
      const loopCount = Math.ceil(targetDurationSeconds / totalSequenceDuration);
      
      console.log(`Estimated sequence duration: ${totalSequenceDuration}s, will loop ${loopCount} times`);
      
      // Create the looped sequence metadata
      const loopedSequence = {
        audioUrls,
        loopCount,
        targetDuration: targetDurationSeconds,
        sequenceDuration: totalSequenceDuration,
        seamlessLoop: true, // Enable seamless looping
        crossfadeDuration: 0.5 // 500ms crossfade between loops
      };
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For now, return a data URL with the sequence information
      // In production, this would generate the actual looped audio file
      const sequenceData = btoa(JSON.stringify(loopedSequence));
      return `data:audio/sequence;base64,${sequenceData}`;
    } catch (error) {
      console.error('Error creating looped sequence:', error);
      throw new Error('Failed to create looped audio sequence');
    }
  },

  async addLoopingBackgroundMusic(voiceSequenceUrl: string, musicStyle: string, durationMinutes: number): Promise<string> {
    try {
      const targetDurationSeconds = durationMinutes * 60;
      console.log(`Adding looping ${musicStyle} background music for ${targetDurationSeconds} seconds`);
      
      // Get the background music URL
      const backgroundMusicUrl = this.getBackgroundMusicUrl(musicStyle);
      console.log(`Background music URL: ${backgroundMusicUrl}`);
      
      // Create the final mixed audio configuration
      const mixedAudioConfig = {
        voiceSequence: voiceSequenceUrl,
        backgroundMusic: {
          url: backgroundMusicUrl,
          loop: true, // Enable seamless background music looping
          volume: 0.3, // Background music at 30% volume
          fadeIn: 2.0, // 2 second fade in
          fadeOut: 2.0, // 2 second fade out
        },
        voice: {
          volume: 0.8, // Voice at 80% volume
          priority: true, // Voice takes priority in mix
        },
        totalDuration: targetDurationSeconds,
        seamlessLoop: true,
        format: 'mp3',
        quality: 'high'
      };
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, return a data URL with the mixed audio configuration
      // In production, this would generate the actual mixed audio file
      const mixedData = btoa(JSON.stringify(mixedAudioConfig));
      return `data:audio/mixed;base64,${mixedData}`;
    } catch (error) {
      console.error('Error adding looping background music:', error);
      throw new Error('Failed to add looping background music');
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

  // Parse audio configuration from data URL
  parseAudioConfig(dataUrl: string): any {
    try {
      if (dataUrl.startsWith('data:audio/sequence;base64,')) {
        const base64Data = dataUrl.replace('data:audio/sequence;base64,', '');
        return JSON.parse(atob(base64Data));
      } else if (dataUrl.startsWith('data:audio/mixed;base64,')) {
        const base64Data = dataUrl.replace('data:audio/mixed;base64,', '');
        return JSON.parse(atob(base64Data));
      }
      return null;
    } catch (error) {
      console.error('Error parsing audio config:', error);
      return null;
    }
  },

  // Get the actual duration of the generated audio
  getAudioDuration(audioUrl: string): number {
    const config = this.parseAudioConfig(audioUrl);
    if (config && config.totalDuration) {
      return config.totalDuration;
    }
    // Fallback to default duration
    return 600; // 10 minutes default
  },

  // Check if audio should loop seamlessly
  isSeamlessLoop(audioUrl: string): boolean {
    const config = this.parseAudioConfig(audioUrl);
    return config?.seamlessLoop === true;
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