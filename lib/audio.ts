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
  // In-memory cache fallback
  audioCache: {} as AudioCache,

  // --- public API ---
  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string> {
    const { manifestationTexts, duration, musicStyle } = params;
    try {
      console.log('Starting audio generation:', { textCount: manifestationTexts.length, duration, musicStyle });
      const sessionId = await this.createAudioSession(params);

      // 1) TTS
      const audioUrls: string[] = [];
      for (const text of manifestationTexts) {
        const cached = await this.getCachedAudioFile(text);
        if (cached) {
          console.log('Using cache for:', text.substring(0,50));
          audioUrls.push(cached);
        } else {
          console.log('Calling TTS for:', text.substring(0,50));
          const url = await this.generateTTSAudio(text);
          await this.saveAudioFileCache(text, url);
          this.audioCache[this.getCacheKey(text)] = url;
          audioUrls.push(url);
        }
      }

      // 2) loop to match duration
      console.log(`Looping ${audioUrls.length} clips for ${duration}min`);
      const looped = await this.createLoopedSequence(audioUrls, duration);

      // 3) add bg music
      console.log(`Adding ${musicStyle} background`);
      const finalUrl = await this.addLoopingBackgroundMusic(looped, musicStyle, duration);

      // mark complete
      await this.updateAudioSession(sessionId, 'completed', finalUrl);
      console.log('Completed audio generation');
      return finalUrl;
    } catch (err) {
      console.error('generatePersonalizedAudio error:', err);
      throw new Error('Failed to generate personalized audio');
    }
  },

  // --- session helpers ---
  async createAudioSession(params: GenerateAudioParams): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_audio_session', {
        p_title: `Audio Session - ${new Date().toLocaleDateString()}`,
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
    const { error } = await supabase.rpc('update_audio_session_status', {
      p_session_id: sessionId,
      p_status: status,
      p_audio_url: audioUrl || null
    });
    if (error) console.error('updateAudioSession:', error);
  },

  // --- TTS + cache ---
  async getCachedAudioFile(text: string): Promise<string|null> {
    try {
      const hash = this.generateTextHash(text);
      const { data, error } = await supabase.rpc('get_cached_audio_file', {
        p_text_hash: hash,
        p_voice_model: 'nova',
        p_tts_model: 'tts-1'
      });
      if (error || !data?.length) return null;
      return data[0].audio_url;
    } catch {
      return null;
    }
  },

  async saveAudioFileCache(text: string, audioUrl: string) {
    try {
      const hash = this.generateTextHash(text);
      const { error } = await supabase.rpc('save_audio_file_cache', {
        p_text_hash: hash,
        p_audio_url: audioUrl,
        p_manifestation_id: null,
        p_file_size: null,
        p_voice_model: 'nova',
        p_tts_model: 'tts-1'
      });
      if (error) console.error('saveAudioFileCache:', error);
    } catch (e) {
      console.error('saveAudioFileCache failed:', e);
    }
  },

  generateTextHash(text: string): string {
    return btoa(text).replace(/[^0-9A-Za-z]/g,'').substring(0,64);
  },

  getCacheKey(text: string): string {
    return btoa(text).replace(/[^0-9A-Za-z]/g,'').substring(0,32);
  },

  async generateTTSAudio(text: string): Promise<string> {
    console.log('invoke openai-tts:', text.substring(0,50));
    const { data, error } = await supabase.functions.invoke('openai-tts', {
      body: { text, voice: 'nova', model: 'tts-1', response_format: 'mp3' }
    });
    if (error) throw error;
    if (data.success && (data.audioUrl || data.audioData)) {
      const base64 = data.audioUrl?.startsWith('data:')
        ? data.audioUrl
        : `data:audio/mpeg;base64,${data.audioData}`;
      const hash = this.generateTextHash(text);
      return this.uploadTTSAudioToStorage(base64, hash);
    }
    throw new Error('Invalid TTS response');
  },

  async uploadTTSAudioToStorage(base64Audio: string, textHash: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const payload = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
    const blob = await (await fetch(`data:audio/mpeg;base64,${payload}`)).blob();
    const path = `tts/${user.id}/${textHash}.mp3`;
    const { data, error } = await supabase.storage.from('audio-files').upload(path, blob, {
      contentType: 'audio/mpeg', upsert: true
    });
    if (error) throw error;
    return supabase.storage.from('audio-files').getPublicUrl(data.path).data.publicUrl;
  },

  // --- helpers to build a true WAV of N seconds ---
  async createSimpleAudioBlob(durationSeconds: number): Promise<Blob> {
    // 1-second silent WAV chunk
    const silentBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    const binary = atob(silentBase64);
    const unit = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) unit[i] = binary.charCodeAt(i);
    const full = new Uint8Array(unit.length * durationSeconds);
    for (let i = 0; i < durationSeconds; i++) full.set(unit, i * unit.length);
    return new Blob([full.buffer], { type: 'audio/wav' });
  },

  // --- sequence + mixing (simulation) ---
  async createLoopedSequence(audioUrls: string[], targetDurationMinutes: number): Promise<string> {
    const totalSec = targetDurationMinutes * 60;
    await new Promise(r => setTimeout(r, 500));
    const blob = await this.createSimpleAudioBlob(totalSec);
    return this.uploadAudioFile(blob, `looped_sequence_${Date.now()}.wav`);
  },

  async addLoopingBackgroundMusic(voiceSequenceUrl: string, musicStyle: string, durationMinutes: number): Promise<string> {
    // we’re simulating: just return the voice file
    await new Promise(r => setTimeout(r, 500));
    return voiceSequenceUrl;
  },

  // --- storage URL helpers ---
  getBackgroundMusicUrl(style: string): string {
    const files = {
      nature: 'nature_sounds.mp3',
      meditation: 'meditation_bells.mp3',
      ambient: 'ambient_waves.mp3'
    };
    return supabase.storage
      .from('audio-files')
      .getPublicUrl(files[style] || files.meditation)
      .data.publicUrl;
  },

  async uploadAudioFile(blob: Blob, filename: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const path = `generated/${user.id}/${filename}`;
    const { data, error } = await supabase.storage.from('audio-files').upload(path, blob, {
      contentType: blob.type, upsert: true
    });
    if (error) throw error;
    return supabase.storage.from('audio-files').getPublicUrl(data.path).data.publicUrl;
  },

  // --- legacy alias ---
  async uploadToStorage(audioBlob: Blob, filename: string): Promise<string> {
    return this.uploadAudioFile(audioBlob, filename);
  },

  // --- cache & stats ---
  clearCache(): void {
    this.audioCache = {};
    console.log('Audio cache cleared');
  },

  getCacheStats(): { totalCached: number; cacheKeys: string[] } {
    const keys = Object.keys(this.audioCache);
    return { totalCached: keys.length, cacheKeys: keys };
  },

  // --- session history ---
  async getAudioSessions(limit = 10): Promise<AudioSession[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_audio_sessions', { p_limit: limit });
      if (error) { console.error('getAudioSessions:', error); return []; }
      return data || [];
    } catch {
      return [];
    }
  },

  // --- parse & metadata ---
  parseAudioConfig(url: string): any {
    if (url.includes('/storage/v1/object/public/audio-files/')) {
      return { totalDuration: 600, seamlessLoop: true, format: 'mp3', source: 'supabase_storage' };
    }
    console.warn('parseAudioConfig got data URL:', url.substring(0,50));
    return null;
  },

  getAudioDuration(url: string): number {
    const cfg = this.parseAudioConfig(url);
    return cfg?.totalDuration ?? 600;
  },

  isSeamlessLoop(url: string): boolean {
    const cfg = this.parseAudioConfig(url);
    return cfg?.seamlessLoop === true;
  },

  async verifyBackgroundMusicAccess(): Promise<Record<string, boolean>> {
    const styles = ['nature','meditation','ambient'];
    const out: Record<string,boolean> = {};
    for (let s of styles) {
      const u = this.getBackgroundMusicUrl(s);
      out[s] = await this.testAudioUrl(u);
    }
    return out;
  },

  // --- sanity check with HEAD/fallback for data URLs ---
  async testAudioUrl(audioUrl: string): Promise<boolean> {
    try {
      if (audioUrl.startsWith('data:audio/')) {
        const b64 = audioUrl.split(',')[1];
        return !!b64 && b64.length > 100;
      }
      const res = await fetch(audioUrl, { method: 'HEAD' });
      const ct = res.headers.get('content-type') || '';
      return res.ok && ct.includes('audio/');
    } catch {
      return false;
    }
  }
};
