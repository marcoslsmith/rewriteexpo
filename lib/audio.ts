// lib/audio.ts
import { supabase } from './supabase'
import type { Database } from './supabase'

interface GenerateAudioParams {
  manifestationTexts: string[]
  duration: number      // in minutes
  musicStyle: string
}

export const audioService = {
  _lastDurationMinutes: 0 as number,

  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string[]> {
    const { manifestationTexts, duration } = params
    this._lastDurationMinutes = duration

    // fire off ALL TTS calls in parallel
    const ttsUrls = await Promise.all(
      manifestationTexts.map(text => this._generateBase64TTS(text))
    )

    return ttsUrls
  },

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

  getAudioDuration(): number {
    return this._lastDurationMinutes * 60
  },
  isSeamlessLoop(): boolean {
    return true
  },
  parseAudioConfig(url: string) {
    return {
      totalDuration: this.getAudioDuration(),
      seamlessLoop: true,
      format: 'mp3',
      source: url.startsWith('data:') ? 'edge-tts' : 'supabase',
    }
  },
}
