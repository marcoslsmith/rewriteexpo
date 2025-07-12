// lib/audio.ts
import { supabase } from './supabase'
import type { Database } from './supabase'

interface GenerateAudioParams {
  manifestationTexts: string[]
  duration: number      // in minutes
  musicStyle: string    // not used here; UI layer handles music selection
}

export const audioService = {
  /** Remember last duration (for player) */
  _lastDurationMinutes: 0 as number,

  /** 
   * Generate a separate TTS clip for each manifestation, then build a
   * looped sequence with 2s pauses and return the final URL.
   */
  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string> {
    const { manifestationTexts, duration } = params
    this._lastDurationMinutes = duration

    // 1) Generate one base64 TTS clip per text
    const ttsUrls = await Promise.all(
      manifestationTexts.map((text) => this._generateBase64TTS(text))
    )

    // 2) Build & upload the final mix
    return await this.createLoopedSequence(ttsUrls, duration)
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

  /** Create a silent WAV Blob of given length (seconds) for pauses or final mix */
  async createSimpleAudioBlob(durationSeconds: number): Promise<Blob> {
    // 1s of silence WAV base64; will repeat in code
    const oneSecBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
    const chunks: string[] = []
    for (let i = 0; i < durationSeconds; i++) {
      chunks.push(oneSecBase64)
    }
    const uri = `data:audio/wav;base64,${chunks.join('')}`
    const res = await fetch(uri)
    return res.blob()
  },

  /** Upload a Blob to your Supabase storage and return its public URL */
  async uploadAudioFile(audioBlob: Blob, filename: string): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const path = `generated/${user.id}/${filename}`
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(path, audioBlob, { contentType: 'audio/mpeg', upsert: true })
    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(data.path)
    return urlData.publicUrl
  },

  /**
   * Stitch voice-clips + 2s pauses, estimate loop count to fill `duration`,
   * then (for now) simulate the final mix by uploading a silent blob of full length.
   */
  async createLoopedSequence(
    audioUrls: string[],
    targetDurationMinutes: number
  ): Promise<string> {
    const targetSeconds = targetDurationMinutes * 60

    // 1) Upload a 2s “pause” clip
    const pauseBlob = await this.createSimpleAudioBlob(2)
    const pauseName = `pause_${Date.now()}.mp3`
    const pauseUrl = await this.uploadAudioFile(pauseBlob, pauseName)

    // 2) Build sequence [clip, pause, clip, pause...]
    const sequence = audioUrls.flatMap((u) => [u, pauseUrl])

    // 3) Rough estimate for one run
    const avgClip = 12  // avg TTS length
    const seqLenSec = sequence.length * (avgClip + 2)
    const loops = Math.ceil(targetSeconds / seqLenSec)

    console.log(`Seq ~${seqLenSec}s; looping ${loops}× to fill ${targetSeconds}s`)

    // 4) **SIMULATION**: upload silent blob of full length (replace with real concat later)
    const finalBlob = await this.createSimpleAudioBlob(targetSeconds)
    const finalName = `mix_${Date.now()}.mp3`
    return await this.uploadAudioFile(finalBlob, finalName)
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
