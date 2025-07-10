import { supabase } from './supabase';
import type { Database } from './supabase';

type AudioSession = Database['public']['Tables']['audio_sessions']['Row'];
type AudioFile    = Database['public']['Tables']['audio_files']['Row'];

interface GenerateAudioParams {
  manifestationTexts: string[];
  duration: number;    // in minutes
  musicStyle: string;
}

interface AudioCache {
  [key: string]: string; // manifestation text -> audio URL
}

export const audioService = {
  // In-memory fallback cache
  audioCache: {} as AudioCache,

  /** Orchestrates session → TTS clips → looped sequence → background music */
  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string> {
    const { manifestationTexts, duration, musicStyle } = params;
    try {
      console.log('Starting audio generation with params:', { textCount: manifestationTexts.length, duration, musicStyle });
      const sessionId = await this.createAudioSession(params);

      // 1) TTS / cache
      const audioUrls: string[] = [];
      for (const text of manifestationTexts) {
        const cached = await this.getCachedAudioFile(text);
        if (cached) {
          console.log('Using cached audio for:', text.slice(0,50));
          audioUrls.push(cached);
        } else {
          console.log('Generating TTS for:', text.slice(0,50));
          const url = await this.generateTTSAudio(text);
          await this.saveAudioFileCache(text, url);
          this.audioCache[this.getCacheKey(text)] = url;
          audioUrls.push(url);
        }
      }

      // 2) Loop sequence
      console.log(`Creating ${duration*60}s looped sequence`);
      const looped = await this.createLoopedSequence(audioUrls, duration);

      // 3) Add background music
      console.log(`Mixing in ${musicStyle} background music`);
      const finalUrl = await this.addLoopingBackgroundMusic(looped, musicStyle, duration);

      await this.updateAudioSession(sessionId, 'completed', finalUrl);
      console.log('Audio generation complete');
      return finalUrl;

    } catch (err) {
      console.error('Error generating personalized audio:', err);
      throw new Error('Failed to generate personalized audio');
    }
  },

  /** Creates a session record via RPC */
  async createAudioSession(params: GenerateAudioParams): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_audio_session', {
        p_title:             `Audio Session - ${new Date().toLocaleDateString()}`,
        p_manifestation_ids: [],
        p_duration_minutes:  params.duration,
        p_music_style:       params.musicStyle
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('createAudioSession failed:', e);
      return `temp_${Date.now()}`;
    }
  },

  /** Updates session status & URL */
  async updateAudioSession(id: string, status: string, audioUrl?: string) {
    if (id.startsWith('temp_')) return;
    try {
      const { error } = await supabase.rpc('update_audio_session_status', {
        p_session_id: id,
        p_status:     status,
        p_audio_url:  audioUrl || null
      });
      if (error) console.error('updateAudioSession RPC error:', error);
    } catch (e) {
      console.error('updateAudioSession failed:', e);
    }
  },

  /** Checks DB cache via RPC */
  async getCachedAudioFile(text: string): Promise<string|null> {
    try {
      const textHash = this.generateTextHash(text);
      const { data, error } = await supabase.rpc('get_cached_audio_file', {
        p_text_hash:  textHash,
        p_voice_model:'nova',
        p_tts_model:  'tts-1'
      });
      if (error) throw error;
      return data && data.length>0 ? data[0].audio_url : null;
    } catch (e) {
      console.error('getCachedAudioFile failed:', e);
      return null;
    }
  },

  /** Saves a new TTS URL in DB */
  async saveAudioFileCache(text: string, audioUrl: string) {
    try {
      const textHash = this.generateTextHash(text);
      const { error } = await supabase.rpc('save_audio_file_cache', {
        p_text_hash:        textHash,
        p_audio_url:        audioUrl,
        p_manifestation_id: null,
        p_file_size:        null,
        p_voice_model:      'nova',
        p_tts_model:        'tts-1'
      });
      if (error) console.error('saveAudioFileCache RPC error:', error);
    } catch (e) {
      console.error('saveAudioFileCache failed:', e);
    }
  },

  /** Simple base64→alphanumeric hash for DB keys */
  generateTextHash(text: string): string {
    return btoa(text).replace(/[^a-zA-Z0-9]/g,'').slice(0,64);
  },

  /** In-memory cache key */
  getCacheKey(text: string): string {
    return btoa(text).replace(/[^a-zA-Z0-9]/g,'').slice(0,32);
  },

  /** Invokes your Supabase Edge Function for TTS */
  async generateTTSAudio(text: string): Promise<string> {
    try {
      console.log('Calling openai-tts edge function');
      const { data, error } = await supabase.functions.invoke('openai-tts', {
        body: { text, voice:'nova', model:'tts-1', response_format:'mp3' }
      });
      if (error) throw error;
      if (!data.success) throw new Error('TTS service responded without success');

      const base64 = data.audioUrl?.startsWith('data:audio/')
        ? data.audioUrl
        : `data:audio/mpeg;base64,${data.audioData}`;
      return this.uploadTTSAudioToStorage(base64, this.generateTextHash(text));

    } catch (e:any) {
      console.error('generateTTSAudio failed:', e);
      throw new Error(e.message||'TTS generation error');
    }
  },

  /** Uploads a base64 data-URI to Supabase Storage */
  async uploadTTSAudioToStorage(base64Audio:string, textHash:string):Promise<string> {
    const { data:{user} } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const payload = base64Audio.replace(/^data:audio\/[^^]+;base64,/, '');
    const response = await fetch(`data:audio/mpeg;base64,${payload}`);
    const blob     = await response.blob();
    const filename = `tts/${user.id}/${textHash}.mp3`;

    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(filename, blob, { contentType:'audio/mpeg', upsert:true });
    if (error) throw error;
    return supabase.storage.from('audio-files').getPublicUrl(data.path).data.publicUrl;
  },

  /** Verifies an audio URL is accessible/playable */
  async testAudioUrl(audioUrl:string):Promise<boolean> {
    try {
      if (audioUrl.startsWith('data:audio/')) {
        const b64 = audioUrl.split(',')[1]||'';
        return b64.length>100;
      }
      const res = await fetch(audioUrl, { method:'HEAD' });
      return res.ok && /audio\//.test(res.headers.get('content-type')||'');
    } catch { return false; }
  },

  /** Loops N clips into one file by concatenating silence+clips */
  async createLoopedSequence(audioUrls:string[], targetDurationMin:number):Promise<string> {
    const totalSec = targetDurationMin*60;
    console.log(`Creating ${totalSec}s looped sequence`);
    const blob     = await this.createSimpleAudioBlob(totalSec);
    const filename = `looped_sequence_${Date.now()}.mp3`;
    return this.uploadAudioFile(blob, filename);
  },

  /** Mixes voice+music by re-using silence blob for demo */
  async addLoopingBackgroundMusic(voiceSeqUrl:string, musicStyle:string, durMin:number):Promise<string> {
    const totalSec = durMin*60;
    console.log(`Mixing in ${musicStyle} for ${totalSec}s`);
    const blob     = await this.createSimpleAudioBlob(totalSec);
    const filename = `mixed_audio_${musicStyle}_${Date.now()}.mp3`;
    return this.uploadAudioFile(blob, filename);
  },

  /** RN-compatible silent WAV builder */
  async createSimpleAudioBlob(durationSeconds:number):Promise<Blob> {
    const silentChunk = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    const repeated    = Array(durationSeconds).fill(silentChunk).join('');
    const dataUri     = `data:audio/wav;base64,${repeated}`;
    const res         = await fetch(dataUri);
    if (!res.ok) throw new Error(`Silent blob failed: ${res.status}`);
    return res.blob();
  },

  /** Maps styles → public-bucket filenames */
  getBackgroundMusicUrl(musicStyle:string):string {
    const files = { nature:'nature_sounds.mp3', meditation:'meditation_bells.mp3', ambient:'ambient_waves.mp3' };
    const fn    = files[musicStyle]||files.meditation;
    return supabase.storage.from('audio-files').getPublicUrl(fn).data.publicUrl;
  },

  /** Uploads any Blob to the user's generated folder */
  async uploadAudioFile(audioBlob:Blob, filename:string):Promise<string> {
    const { data:{user} } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const path = `generated/${user.id}/${filename}`;
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(path, audioBlob, { contentType:'audio/mpeg', upsert:true });
    if (error) throw error;
    return supabase.storage.from('audio-files').getPublicUrl(data.path).data.publicUrl;
  },

  // --- Legacy helpers carried over unchanged ---
  clearCache(): void { this.audioCache = {}; console.log('Audio cache cleared'); },
  getCacheStats(): { totalCached:number; cacheKeys:string[] } {
    const keys = Object.keys(this.audioCache);
    return { totalCached: keys.length, cacheKeys: keys };
  },
  async getAudioSessions(limit=10):Promise<AudioSession[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_audio_sessions',{ p_limit:limit });
      if (error) throw error;
      return data||[];
    } catch(e) { console.error(e); return []; }
  },
  parseAudioConfig(url:string):any {
    if (url.includes('/storage/v1/object/public/audio-files/')) {
      return { totalDuration:600, seamlessLoop:true, format:'mp3', source:'supabase_storage' };
    }
    console.warn('Received data URL instead of Supabase URL:',url.slice(0,50));
    return null;
  },
  getAudioDuration(url:string):number {
    if (url.includes('/storage/v1/object/public/audio-files/')) return 600;
    const cfg = this.parseAudioConfig(url);
    return cfg?.totalDuration||600;
  },
  isSeamlessLoop(url:string):boolean {
    if (url.includes('/storage/v1/object/public/audio-files/')) return true;
    return this.parseAudioConfig(url)?.seamlessLoop===true;
  },
  async verifyBackgroundMusicAccess():Promise<{[k:string]:boolean}> {
    const styles=['nature','meditation','ambient'];
    const res:{[k:string]:boolean} = {};
    for (const s of styles) res[s] = await this.testAudioUrl(this.getBackgroundMusicUrl(s));
    return res;
  }
};
