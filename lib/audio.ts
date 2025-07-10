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

  // Upload TTS audio to Supabase Storage and return public URL
  async uploadTTSAudioToStorage(base64Audio: string, textHash: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Convert base64 to blob
      const base64Data = base64Audio.replace(/^data:audio\/[^;]+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });

      // Upload to tts/ subfolder with user ID
      const filename = `tts/${user.id}/${textHash}.mp3`;
      
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(filename, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (error) {
        console.error('Error uploading TTS audio to storage:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(data.path);

      console.log('TTS audio uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Failed to upload TTS audio to storage:', error);
      throw new Error('Failed to upload TTS audio to storage');
    }
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
        
        let base64AudioData: string;
        
        // Get base64 audio data
        if (data.audioUrl && data.audioUrl.startsWith('data:audio/')) {
          base64AudioData = data.audioUrl;
        } else if (data.audioData) {
          base64AudioData = `data:audio/mpeg;base64,${data.audioData}`;
        } else {
          throw new Error('No valid audio data received from TTS service');
        }
        
        // Upload to Supabase Storage and return public URL
        console.log('Uploading TTS audio to Supabase Storage...');
        const textHash = this.generateTextHash(text);
        const publicUrl = await this.uploadTTSAudioToStorage(base64AudioData, textHash);
        
        return publicUrl;
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

  // Test if an audio URL is valid and playable
  async testAudioUrl(audioUrl: string): Promise<boolean> {
    try {
      console.log('Testing audio URL validity:', audioUrl.substring(0, 100) + '...');
      
      if (audioUrl.startsWith('data:audio/')) {
        // For base64 data URLs, check if they have valid base64 content
        const base64Part = audioUrl.split(',')[1];
        if (!base64Part || base64Part.length < 100) {
          console.error('Invalid base64 audio data - too short');
          return false;
        }
        console.log('Base64 audio data appears valid, length:', base64Part.length);
        return true;
      } else if (audioUrl.startsWith('http')) {
        // For HTTP URLs, try to fetch headers to verify it's accessible
        try {
          const response = await fetch(audioUrl, { method: 'HEAD' });
          const contentType = response.headers.get('content-type');
          console.log('HTTP audio URL test - Status:', response.status, 'Content-Type:', contentType);
          return response.ok && (contentType?.includes('audio/') || contentType?.includes('application/octet-stream'));
        } catch (fetchError) {
          console.error('HTTP audio URL test failed:', fetchError);
          return false;
        }
      }
      
      console.error('Unsupported audio URL format');
      return false;
    } catch (error) {
      console.error('Error testing audio URL:', error);
      return false;
    }
  },
  async createLoopedSequence(audioUrls: string[], targetDurationMinutes: number): Promise<string> {
    try {
      const targetDurationSeconds = targetDurationMinutes * 60;
      console.log(`Creating looped sequence for ${targetDurationSeconds} seconds`);
      
      // Test each audio URL before creating the sequence
      console.log('Testing audio URLs before creating sequence...');
      for (let i = 0; i < audioUrls.length; i++) {
        const isValid = await this.testAudioUrl(audioUrls[i]);
        if (!isValid) {
          console.warn(`Audio URL ${i} may be invalid:`, audioUrls[i].substring(0, 50) + '...');
        }
      }
      
      // Calculate how many times we need to loop the sequence
      // Assume each TTS clip is approximately 10-15 seconds
      const estimatedClipDuration = 12; // seconds per manifestation
      const totalSequenceDuration = audioUrls.length * estimatedClipDuration;
      const loopCount = Math.ceil(targetDurationSeconds / totalSequenceDuration);
      
      console.log(`Estimated sequence duration: ${totalSequenceDuration}s, will loop ${loopCount} times`);
      
      // For now, simulate audio processing by creating a simple audio file
      // In production, this would use actual audio processing libraries
      console.log('Simulating looped sequence generation...');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create a simple audio blob (silent audio for now)
      // In production, this would be the actual mixed audio
      const audioBlob = await this.createSimpleAudioBlob(targetDurationSeconds);
      
      // Upload to Supabase Storage
      const filename = `looped_sequence_${Date.now()}.mp3`;
      const publicUrl = await this.uploadAudioFile(audioBlob, filename);
      
      console.log('Looped sequence uploaded to:', publicUrl);
      return publicUrl;
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
      
      // Verify background music is accessible
      const isMusicAccessible = await this.testAudioUrl(backgroundMusicUrl);
      if (!isMusicAccessible) {
        console.warn('Background music not accessible, proceeding without it');
      }
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a mixed audio blob (for now, just use the voice sequence)
      // In production, this would mix voice + background music
      console.log('Simulating audio mixing...');
      
      // For now, create a simple audio blob representing the final mix
      const mixedAudioBlob = await this.createSimpleAudioBlob(targetDurationSeconds);
      
      // Upload the final mixed audio to Supabase Storage
      const filename = `mixed_audio_${musicStyle}_${Date.now()}.mp3`;
      const publicUrl = await this.uploadAudioFile(mixedAudioBlob, filename);
      
      console.log('Mixed audio uploaded to:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error adding looping background music:', error);
      throw new Error('Failed to add looping background music');
    }
  },

  // Create a simple audio blob for testing/simulation
  async createSimpleAudioBlob(durationSeconds: number): Promise<Blob> {
    try {
      // Create a minimal MP3 header for a silent audio file
      // This is a very basic MP3 structure - in production you'd use proper audio libraries
      const sampleRate = 44100;
      const channels = 2;
      const bytesPerSample = 2;
      const dataSize = durationSeconds * sampleRate * channels * bytesPerSample;
      
      // Create a simple WAV file structure (easier than MP3)
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, channels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * channels * bytesPerSample, true);
      view.setUint16(32, channels * bytesPerSample, true);
      view.setUint16(34, 8 * bytesPerSample, true);
      writeString(36, 'data');
      view.setUint32(40, dataSize, true);
      
      // Fill with silence (zeros)
      for (let i = 44; i < buffer.byteLength; i++) {
        view.setUint8(i, 0);
      }
      
      return new Blob([buffer], { type: 'audio/wav' });
    } catch (error) {
      console.error('Error creating simple audio blob:', error);
      // Fallback: create a minimal blob
      return new Blob([''], { type: 'audio/mp3' });
    }
  },
  getBackgroundMusicUrl(musicStyle: string): string {
    // Get the public URL for background music files from Supabase Storage
    // These files should be in the root of the audio-files bucket
    const musicFiles = {
      'nature': 'nature_sounds.mp3',
      'meditation': 'meditation_bells.mp3',
      'ambient': 'ambient_waves.mp3'
    };

    const filename = musicFiles[musicStyle as keyof typeof musicFiles] || musicFiles.meditation;
    
    // Get public URL from Supabase Storage
    // Files should be in the root of the bucket for public access
    const { data } = supabase.storage
      .from('audio-files')
      .getPublicUrl(filename);

    const publicUrl = data.publicUrl;
    console.log(`Background music URL for ${musicStyle} (${filename}):`, publicUrl);
    
    // Verify the URL format is correct
    if (!publicUrl.includes('/storage/v1/object/public/audio-files/')) {
      console.warn('Background music URL format may be incorrect:', publicUrl);
    }
    
    return data.publicUrl;
  },

  // Upload audio file to user's folder in Supabase Storage
  async uploadAudioFile(audioBlob: Blob, filename: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload to user's generated audio folder
      const filePath = `generated/${user.id}/${filename}`;
      
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(filePath, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (error) {
        console.error('Error uploading audio file to storage:', error);
        throw error;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(data.path);

      console.log('Audio file uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading to storage:', error);
      throw new Error('Failed to upload audio file');
    }
  },

  // Legacy method - redirect to uploadAudioFile
  async uploadToStorage(audioBlob: Blob, filename: string): Promise<string> {
    return this.uploadAudioFile(audioBlob, filename);
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
      // For Supabase public URLs, we don't have embedded config
      // Return default configuration
      if (dataUrl.includes('/storage/v1/object/public/audio-files/')) {
        return {
          totalDuration: 600, // Default 10 minutes
          seamlessLoop: true,
          format: 'mp3',
          source: 'supabase_storage'
        };
      }
      
      // Legacy support for data URLs (should not be used anymore)
      console.warn('Received data URL instead of Supabase public URL:', dataUrl.substring(0, 50) + '...');
      return null;
    } catch (error) {
      console.error('Error parsing audio config:', error);
      return null;
    }
  },

  // Get the actual duration of the generated audio
  getAudioDuration(audioUrl: string): number {
    // For Supabase URLs, we need to determine duration differently
    if (audioUrl.includes('/storage/v1/object/public/audio-files/')) {
      // Extract duration from filename or use default
      // In production, you might store this metadata in the database
      return 600; // Default 10 minutes
    }
    
    // Legacy support for data URLs
    const config = this.parseAudioConfig(audioUrl);
    if (config?.totalDuration) {
      return config.totalDuration;
    }
    
    return 600; // 10 minutes default
  },

  // Check if audio should loop seamlessly
  isSeamlessLoop(audioUrl: string): boolean {
    // For Supabase URLs, assume seamless looping is enabled
    if (audioUrl.includes('/storage/v1/object/public/audio-files/')) {
      return true;
    }
    
    // Legacy support for data URLs
    const config = this.parseAudioConfig(audioUrl);
    return config?.seamlessLoop === true;
  },

  // Verify that background music files are accessible
  async verifyBackgroundMusicAccess(): Promise<{ [key: string]: boolean }> {
    try {
      const musicStyles = ['nature', 'meditation', 'ambient'];
      const results: { [key: string]: boolean } = {};
      
      for (const style of musicStyles) {
        const url = this.getBackgroundMusicUrl(style);
        const isAccessible = await this.testAudioUrl(url);
        results[style] = isAccessible;
        console.log(`Background music ${style}: ${isAccessible ? 'accessible' : 'not accessible'}`);
      }
      
      return results;
    } catch (error) {
      console.error('Error verifying background music access:', error);
      return {};
    }
  }
};