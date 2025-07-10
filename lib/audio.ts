// lib/audioService.ts
import { supabase } from './supabase';
import type { Database } from './supabase';

type AudioSession = Database['public']['Tables']['audio_sessions']['Row'];
type AudioFile    = Database['public']['Tables']['audio_files']['Row'];

interface GenerateAudioParams {
  manifestationTexts: string[];
  duration: number;   // in minutes (kept for player)
  musicStyle: string; // (kept for player)
}

export const audioService = {
  // Stores the last duration so getAudioDuration() can report it
  _lastDurationMinutes: 0,

  /**
   * Generate TTS clips for each text, upload to Storage, and return public URLs.
   */
  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string[]> {
    const { manifestationTexts, duration } = params;
    this._lastDurationMinutes = duration;

    const urls: string[] = [];
    for (const text of manifestationTexts) {
      const url = await this._generateAndUploadTTS(text);
      urls.push(url);
    }
    return urls;
  },

  /** Call Edge Function, extract base64, upload, and return public URL */
  private async _generateAndUploadTTS(text: string): Promise<string> {
    // 1) Invoke your OpenAI TTS edge function
    const { data, error } = await supabase.functions.invoke('openai-tts', {
      body: { text, voice: 'nova', model: 'tts-1', response_format: 'mp3' }
    });
    if (error) throw new Error(`TTS error: ${error.message}`);

    // 2) Get base64 data URI
    const base64 =
      data.audioUrl?.startsWith('data:')
        ? data.audioUrl
        : data.audioData
          ? `data:audio/mpeg;base64,${data.audioData}`
          : null;
    if (!base64) throw new Error('No audio data returned from TTS');

    // 3) Upload to Storage
    const key  = this._hashText(text);
    return this._uploadBase64ToStorage(base64, key);
  },

  /** Upload a base64-encoded audio clip to Supabase Storage and return its public URL */
  private async _uploadBase64ToStorage(base64: string, key: string): Promise<string> {
    // 1) Ensure user is signed in
    const {
      data: { user },
      error: authErr
    } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error('User not authenticated');

    // 2) Convert to Blob and upload
    const blob = await fetch(base64).then(r => r.blob());
    const path = `tts/${user.id}/${key}.mp3`;

    const { data: up, error: upErr } = await supabase
      .storage
      .from('audio-files')
      .upload(path, blob, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw upErr;

    // 3) Get public URL
    const { data: urlData } = supabase
      .storage
      .from('audio-files')
      .getPublicUrl(up.path);

    return urlData.publicUrl;
  },

  /** Simple hash for caching/upload paths */
  private _hashText(text: string): string {
    return btoa(text)
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 64);
  },

  /** For your player: total duration in seconds */
  getAudioDuration(): number {
    return this._lastDurationMinutes * 60;
  },

  /** Always loop seamlessly */
  isSeamlessLoop(): boolean {
    return true;
  },

  /** Stub for the UI: tells your player how to treat this track */
  parseAudioConfig(url: string) {
    return {
      totalDuration: this.getAudioDuration(),
      seamlessLoop: true,
      format: 'mp3',
      source: url.includes('/storage/v1/object/public/') ? 'supabase' : 'edge-tts'
    };
  }
};
