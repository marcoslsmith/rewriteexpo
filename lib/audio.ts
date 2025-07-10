// audioService.ts
import { supabase } from './supabase';
import type { Database } from './supabase';

interface GenerateAudioParams {
  manifestationTexts: string[];
  duration: number; // in minutes
  musicStyle: string;
}

export const audioService = {
  // remembers how many minutes the user asked for
  _lastDurationMinutes: 0,

  /** 
   * Generates one TTS clip (of the first text) and returns its public URL.
   * Your UI will then loop it locally for the full duration.
   */
  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string> {
    const { manifestationTexts, duration } = params;
    this._lastDurationMinutes = duration;

    // pick the first text (you can extend this later)
    const text = manifestationTexts[0];
    return await this._generateAndUploadTTS(text);
  },

  /** 
   * Helper to call your Supabase Edge Function + upload to Storage
   */
  async _generateAndUploadTTS(text: string): Promise<string> {
    // 1) Invoke the TTS Edge Function
    const { data, error } = await supabase.functions.invoke('openai-tts', {
      body: { text, voice: 'nova', model: 'tts-1', response_format: 'mp3' }
    });
    if (error) throw new Error(error.message);

    // 2) Extract the base64 payload
    const base64 =
      data.audioUrl?.startsWith('data:') ? data.audioUrl :
      data.audioData ? `data:audio/mpeg;base64,${data.audioData}` :
      null;
    if (!base64) throw new Error('No audio returned from TTS');

    // 3) Upload to Supabase Storage
    const hash = this._hashText(text);
    const publicUrl = await this._uploadBase64ToStorage(base64, hash);
    return publicUrl;
  },

  /** Uploads a data:audio/... base64 string as an MP3 blob */
  async _uploadBase64ToStorage(base64: string, key: string): Promise<string> {
    // get the user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // turn data: URI into a Blob
    const blob = await fetch(base64).then((r) => r.blob());

    // upload under tts/<user>/<key>.mp3
    const path = `tts/${user.id}/${key}.mp3`;
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(path, blob, { contentType: 'audio/mpeg', upsert: true });
    if (error) throw error;

    // grab the public URL
    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  },

  /** Simple base64 → clean alphanumeric hash */
  _hashText(text: string): string {
    return btoa(text)
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 64);
  },

  /** UI calls this to know how long the session is (in seconds) */
  getAudioDuration(): number {
    return this._lastDurationMinutes * 60;
  },

  /** UI calls this to decide whether to loop seamlessly */
  isSeamlessLoop(): boolean {
    return true;
  },
};
