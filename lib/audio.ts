import { supabase } from './supabase';

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
      // Step 1: Check cache and generate TTS for each manifestation
      const audioUrls: string[] = [];
      
      for (const text of manifestationTexts) {
        const cacheKey = this.getCacheKey(text);
        
        if (this.audioCache[cacheKey]) {
          console.log('Using cached audio for:', text.substring(0, 50) + '...');
          audioUrls.push(this.audioCache[cacheKey]);
        } else {
          console.log('Generating new audio for:', text.substring(0, 50) + '...');
          const audioUrl = await this.generateTTSAudio(text);
          this.audioCache[cacheKey] = audioUrl;
          audioUrls.push(audioUrl);
        }
      }

      // Step 2: Combine audio clips to match desired duration
      const combinedAudioUrl = await this.combineAudioClips(audioUrls, duration);

      // Step 3: Add background music
      const finalAudioUrl = await this.addBackgroundMusic(combinedAudioUrl, musicStyle);

      return finalAudioUrl;
    } catch (error) {
      console.error('Error generating personalized audio:', error);
      throw new Error('Failed to generate personalized audio');
    }
  },

  getCacheKey(text: string): string {
    // Create a simple hash of the text for caching
    return btoa(text).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  },

  async generateTTSAudio(text: string): Promise<string> {
    try {
      // Call OpenAI TTS API via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('openai-tts', {
        body: {
          text: text,
          voice: 'alloy', // Calm, soothing voice
          model: 'tts-1',
          response_format: 'mp3'
        }
      });

      if (error) {
        console.error('TTS generation error:', error);
        throw new Error('Failed to generate speech audio');
      }

      if (data?.audioUrl) {
        return data.audioUrl;
      }

      throw new Error('No audio URL returned from TTS service');
    } catch (error) {
      console.error('TTS generation failed:', error);
      // Return a placeholder URL for development
      return 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
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
      
      // Return placeholder combined audio URL
      return audioUrls[0] || 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
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
      // 2. Get the appropriate background music track
      // 3. Mix them together with proper volume levels
      // 4. Upload the final mixed audio to Supabase Storage
      // 5. Return the public URL
      
      console.log(`Adding ${musicStyle} background music to audio`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Return placeholder final audio URL
      return voiceAudioUrl;
    } catch (error) {
      console.error('Error adding background music:', error);
      throw new Error('Failed to add background music');
    }
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
  }
};