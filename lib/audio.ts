import { supabase } from './supabase';
import type { Database } from './supabase';

type AudioSession = Database['public']['Tables']['audio_sessions']['Row'];

type GenerateAudioParams = {
  manifestationTexts: string[];
  duration: number; // in minutes
  musicStyle: string;
};

export const audioService = {
  // Cache for storing generated audio URLs
  audioCache: {} as Record<string,string>,

  /**
   * Generate personalized audio: returns the first TTS clip URL.
   * Audio looping and background should be handled by your AudioPlayer.
   */
  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string> {
    const { manifestationTexts } = params;
    try {
      // Create session record (optional)
      const sessionId = await this.createAudioSession(params);

      // Generate or fetch each TTS URL
      const audioUrls: string[] = [];
      for (const text of manifestationTexts) {
        const cached = await this.getCachedAudioFile(text);
        if (cached) {
          audioUrls.push(cached);
        } else {
          const url = await this.generateTTSAudio(text);
          await this.saveAudioFileCache(text, url);
          audioUrls.push(url);
        }
      }

      // Pick the first clip for playback
      const finalUrl = audioUrls[0];

      // Mark session completed
      await this.updateAudioSession(sessionId, 'completed', finalUrl);
      return finalUrl;
    } catch (err) {
      console.error('generatePersonalizedAudio error:', err);
      throw new Error('Failed to generate personalized audio');
    }
  },

  // --- Session helpers ---
  async createAudioSession(params: GenerateAudioParams): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_audio_session', {
        p_title: `Audio Session - ${new Date().toLocaleString()}`,
        p_manifestation_ids: [],
        p_duration_minutes: params.duration,
        p_music_style: params.musicStyle
      });
      if (error) throw error;
      return data;
    } catch {
      return `temp_${Date.now()}`;
    }
  },

  async updateAudioSession(sessionId: string, status: string, audioUrl?: string) {
    if (sessionId.startsWith('temp_')) return;
    try {
      const { error } = await supabase.rpc('update_audio_session_status', {
        p_session_id: sessionId,
        p_status: status,
        p_audio_url: audioUrl || null
      });
      if (error) console.error(error);
    } catch (e) {
      console.error(e);
    }
  },

  // --- Caching ---
  async getCachedAudioFile(text: string): Promise<string|null> {
    try {
      const hash = this._hash(text);
      const { data, error } = await supabase.rpc('get_cached_audio_file', {
        p_text_hash: hash,
        p_voice_model: 'nova',
        p_tts_model: 'tts-1'
      });
      if (error) throw error;
      return data?.[0]?.audio_url || null;
    } catch {
      return null;
    }
  },

  async saveAudioFileCache(text: string, url: string) {
    try {
      const hash = this._hash(text);
      await supabase.rpc('save_audio_file_cache', {
        p_text_hash: hash,
        p_audio_url: url,
        p_manifestation_id: null,
        p_file_size: null,
        p_voice_model: 'nova',
        p_tts_model: 'tts-1'
      });
    } catch (e) {
      console.error('cache save error:', e);
    }
  },

  _hash(text: string) {
    return btoa(text).replace(/[^a-zA-Z0-9]/g, '').slice(0,64);
  },

  // --- TTS ---
  async generateTTSAudio(text: string): Promise<string> {
    // invoke edge function
    const { data, error } = await supabase.functions.invoke('openai-tts', {
      body: { text, voice: 'nova', model: 'tts-1', response_format: 'mp3' }
    });
    if (error || !data?.success) {
      console.error('TTS error:', error || data);
      throw new Error('TTS generation failed');
    }
    // get base64 or audioUrl
    const base64 = data.audioData
      ? `data:audio/mpeg;base64,${data.audioData}`
      : data.audioUrl;
    // upload and return public URL
    const hash = this._hash(text);
    return this._uploadBase64(base64, `tts_${hash}.mp3`);
  },

  async _uploadBase64(base64: string, filename: string): Promise<string> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error('not auth');
    // strip prefix
    const b64 = base64.split(',')[1];
    const blob = await fetch(`data:audio/mpeg;base64,${b64}`).then(r=>r.blob());
    const path = `tts/${uid}/${filename}`;
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(path, blob, { contentType: blob.type, upsert: true });
    if (error) throw error;
    return supabase.storage.from('audio-files').getPublicUrl(data.path).data.publicUrl;
  },

  // --- utilities ---
  clearCache() { this.audioCache = {}; },
  getCacheStats() { return Object.keys(this.audioCache).length; }
};
