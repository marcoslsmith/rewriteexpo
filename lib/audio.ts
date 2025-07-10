// audioService.ts
import { supabase } from './supabase';
import type { Database } from './supabase';

interface GenerateAudioParams {
  manifestationTexts: string[];
  duration: number; // in minutes
  musicStyle: string;
}

export const audioService = {
  _lastDurationMinutes: 0,

  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string> {
    const { manifestationTexts, duration } = params;
    this._lastDurationMinutes = duration;
    const text = manifestationTexts[0];
    return this._generateAndUploadTTS(text);
  },

  async _generateAndUploadTTS(text: string): Promise<string> {
    // 1) Call Edge Function
    const { data, error } = await supabase.functions.invoke('openai-tts', {
      body: { text, voice: 'nova', model: 'tts-1', response_format: 'mp3' }
    });
    if (error) throw new Error(error.message);

    // 2) Extract base64
    const base64 =
      data.audioUrl?.startsWith('data:') ? data.audioUrl :
      data.audioData ? `data:audio/mpeg;base64,${data.audioData}` :
      null;
    if (!base64) throw new Error('No audio returned');

    // 3) Upload it
    const key = this._hashText(text);
    return this._uploadBase64ToStorage(base64, key);
  },

  async _uploadBase64ToStorage(base64: string, key: string): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const blob = await fetch(base64).then(r => r.blob());
    const path = `tts/${user.id}/${key}.mp3`;

    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(path, blob, { contentType: 'audio/mpeg', upsert: true });
    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  },

  _hashText(text: string): string {
    return btoa(text)
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 64);
  },

  getAudioDuration(): number {
    return this._lastDurationMinutes * 60;
  },

  isSeamlessLoop(): boolean {
    return true;
  },

  /** 
   * Stub for your UI – returns the same info your player needs 
   */
  parseAudioConfig(url: string) {
    return {
      totalDuration: this.getAudioDuration(),
      seamlessLoop: true,
      format: 'mp3',
      source: url.includes('/storage/v1/object/public/') ? 'supabase' : 'edge-tts'
    };
  },
};
