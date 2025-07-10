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
  audioCache: {} as AudioCache,

  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string> {
    const { manifestationTexts, duration, musicStyle } = params;
    
    try {
      console.log('Starting audio generation with params:', {
        textCount: manifestationTexts.length,
        duration,
        musicStyle
      });

      // Step 1: Generate TTS for the first manifestation
      const text = manifestationTexts[0];
      console.log('Generating TTS for:', text.substring(0, 50) + '...');
      
      // Check cache first
      const cacheKey = this.getCacheKey(text);
      if (this.audioCache[cacheKey]) {
        console.log('Using cached TTS audio');
        return this.audioCache[cacheKey];
      }

      // Generate new TTS audio and upload to storage
      const ttsUrl = await this.generateAndUploadTTS(text);
      
      // Cache the result
      this.audioCache[cacheKey] = ttsUrl;
      
      console.log('Audio generation completed successfully');
      return ttsUrl;
    } catch (error) {
      console.error('Error generating personalized audio:', error);
      throw new Error('Failed to generate personalized audio');
    }
  },

  async generateAndUploadTTS(text: string): Promise<string> {
    try {
      // 1) Call Edge Function to generate TTS
      console.log('Calling OpenAI TTS Edge Function...');
      const { data, error } = await supabase.functions.invoke('openai-tts', {
        body: {
          text: text,
          voice: 'nova',
          model: 'tts-1',
          response_format: 'mp3'
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(`TTS generation failed: ${error.message}`);
      }

      if (!data?.success || (!data?.audioUrl && !data?.audioData)) {
        console.error('Invalid TTS response:', data);
        throw new Error('No audio data received from TTS service');
      }

      // 2) Extract base64 audio data
      let base64AudioData: string;
      if (data.audioUrl && data.audioUrl.startsWith('data:audio/')) {
        base64AudioData = data.audioUrl;
      } else if (data.audioData) {
        base64AudioData = `data:audio/mpeg;base64,${data.audioData}`;
      } else {
        throw new Error('No valid audio data in TTS response');
      }

      // 3) Upload to Supabase Storage and return public URL
      console.log('Uploading TTS audio to Supabase Storage...');
      const textHash = this.generateTextHash(text);
      const publicUrl = await this.uploadBase64ToStorage(base64AudioData, textHash);
      
      console.log('TTS audio uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error in generateAndUploadTTS:', error);
      throw error;
    }
  },

  async uploadBase64ToStorage(base64Audio: string, textHash: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Convert base64 to blob using fetch (React Native compatible)
      const response = await fetch(base64Audio);
      const audioBlob = await response.blob();

      // Upload to tts/ subfolder with user ID
      const filename = `tts/${user.id}/${textHash}.mp3`;
      
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(filename, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(data.path);

      console.log('Audio uploaded to storage:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading base64 to storage:', error);
      throw error;
    }
  },

  generateTextHash(text: string): string {
    // Create a consistent hash of the text for caching
    return btoa(text).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
  },

  getCacheKey(text: string): string {
    // Create a simple hash of the text for caching
    return btoa(text).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
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

  getBackgroundMusicUrl(musicStyle: string): string {
    // Get the public URL for background music files from Supabase Storage root
    const musicFiles = {
      'nature': 'nature_sounds.mp3',
      'meditation': 'meditation_bells.mp3',
      'ambient': 'ambient_waves.mp3'
    };

    const filename = musicFiles[musicStyle as keyof typeof musicFiles] || musicFiles.meditation;
    
    // Get public URL from Supabase Storage (files are in root of bucket)
    const { data } = supabase.storage
      .from('audio-files')
      .getPublicUrl(filename);

    console.log(`Background music URL for ${musicStyle}:`, data.publicUrl);
    return data.publicUrl;
  },

  // Verify background music files are accessible
  async verifyBackgroundMusicAccess(): Promise<{ [key: string]: boolean }> {
    const musicStyles = ['nature', 'meditation', 'ambient'];
    const results: { [key: string]: boolean } = {};
    
    for (const style of musicStyles) {
      const url = this.getBackgroundMusicUrl(style);
      results[style] = await this.testAudioUrl(url);
    }
    
    return results;
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

  // Parse audio configuration from URL
  parseAudioConfig(audioUrl: string): any {
    try {
      // For Supabase URLs, return basic config
      if (audioUrl.startsWith('http')) {
        return {
          totalDuration: 600, // 10 minutes default
          seamlessLoop: true,
          format: 'mp3',
          source: 'supabase'
        };
      }
      
      // For base64 URLs, return basic config
      if (audioUrl.startsWith('data:audio/')) {
        return {
          totalDuration: 300, // 5 minutes default for TTS
          seamlessLoop: false,
          format: 'mp3',
          source: 'tts'
        };
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

      const filePath = `generated/${user.id}/${filename}`;
      
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