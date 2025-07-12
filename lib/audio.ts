// lib/audio.ts
import { supabase } from './supabase'
import type { Database } from './supabase'

interface GenerateAudioParams {
  manifestationTexts: string[]
  duration: number      // in minutes
  musicStyle: string    // still unused here; UI handles music selection
}

export const audioService = {
  /** Remember last duration (for player) */
  _lastDurationMinutes: 0 as number,

  /**
   * Generate a separate TTS clip for each manifestation,
   * then (for now) just return the first clip URL.
   */
  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string> {
    const { manifestationTexts, duration } = params
    this._lastDurationMinutes = duration

    // 1) Fire off all TTS calls in parallel
    const ttsUrls = await Promise.all(
      manifestationTexts.map((text) => this._generateBase64TTS(text))
    )

    // 2) — TEMPORARY WORKAROUND —
    //    rather than trying to stitch / loop them client-side,
    //    just return the first real TTS clip.
    console.warn(
      '[audioService] mixing disabled: returning first TTS clip only'
    )
    return ttsUrls[0]
  },

  /** Call your Edge Function and return a base64 data URL */
  async _generateBase64TTS(text: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('openai-tts', {
      body: { text, voice: 'nova', model: 'tts-1', response_format: 'mp3' },
    })
    if (error) throw new Error(error.message)

    const base64 =
      data.audioUrl?.startsWith('data:')
        ? data.audioUrl
        : data.audioData
        ? `data:audio/mpeg;base64,${data.audioData}`
        : null

    if (!base64) throw new Error('No audio returned from TTS')
    return base64
  },

  /** For your player: total duration in seconds */
  getAudioDuration(): number {
    return this._lastDurationMinutes * 60
  },

  /** For your player: seamless looping */
  isSeamlessLoop(): boolean {
    return true
  },

  /** Extra info for debugging/UI */
  parseAudioConfig(url: string) {
    return {
      totalDuration: this.getAudioDuration(),
      seamlessLoop: true,
      format: 'mp3',
      source: url.startsWith('data:') ? 'edge-tts' : 'supabase',
    }
  },
}
