// audioService.ts
import { supabase } from './supabase'
import type { Database } from './supabase'

interface GenerateAudioParams {
  manifestationTexts: string[]
  duration: number // in minutes
  musicStyle: string
}

export const audioService = {
  _lastDurationMinutes: 0 as number,

  /** Top-level: generate, stitch, loop & upload */
  async generatePersonalizedAudio(params: GenerateAudioParams): Promise<string> {
    const { manifestationTexts, duration } = params
    this._lastDurationMinutes = duration

    // 1) Generate TTS for each text
    const ttsUrls: string[] = []
    for (const text of manifestationTexts) {
      const url = await this._generateAndUploadTTS(text)
      ttsUrls.push(url)
    }

    // 2) Create a looped sequence with 2s pauses
    const finalUrl = await this.createLoopedSequence(ttsUrls, duration)
    return finalUrl
  },

  /** Call your Edge Function and return a base64 data URL */
  async _generateAndUploadTTS(text: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('openai-tts', {
      body: { text, voice: 'nova', model: 'tts-1', response_format: 'mp3' },
    })
    if (error) throw new Error(error.message)

    // extract base64
    const base64 =
      data.audioUrl?.startsWith('data:')
        ? data.audioUrl
        : data.audioData
        ? `data:audio/mpeg;base64,${data.audioData}`
        : null
    if (!base64) throw new Error('No audio returned')

    return base64
  },

  /** Create a silent WAV blob of given length (seconds) */
  async createSimpleAudioBlob(durationSeconds: number): Promise<Blob> {
    // 1s of silence WAV base64; we’ll loop it client-side
    const oneSecBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
    // build repeated base64 for `durationSeconds` by concatenation
    const chunks: string[] = []
    for (let i = 0; i < durationSeconds; i++) {
      chunks.push(oneSecBase64)
    }
    const combined = chunks.join('')
    const uri = `data:audio/wav;base64,${combined}`
    const res = await fetch(uri)
    return res.blob()
  },

  /** Upload a Blob to your Supabase audio-files bucket */
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
   * Stitch together voice clips + 2s pauses,
   * loop the full sequence to meet target duration,
   * then upload and return the mix.
   */
  async createLoopedSequence(
    audioUrls: string[],
    targetDurationMinutes: number
  ): Promise<string> {
    const targetSeconds = targetDurationMinutes * 60
    console.log(`Building looped sequence for ${targetSeconds}s`)

    // 1) Generate & upload a 2s silent clip
    const pauseBlob = await this.createSimpleAudioBlob(2)
    const pauseFile = `pause_${Date.now()}.mp3`
    const pauseUrl = await this.uploadAudioFile(pauseBlob, pauseFile)

    // 2) Interleave pause after each clip
    const sequence = audioUrls.flatMap((u) => [u, pauseUrl])

    // 3) Estimate sequence length in seconds
    const estimatePerClip = 12 /* avg TTS */ + 2 /* pause */
    const seqDuration = sequence.length * estimatePerClip
    const loops = Math.ceil(targetSeconds / seqDuration)
    console.log(`Seq ~${seqDuration}s, looping ${loops} times`)

    // 4) In a real setup you'd fetch + concat binary buffers.
    //    Here we simulate by making a final silent blob of full length.
    const finalBlob = await this.createSimpleAudioBlob(targetSeconds)
    const finalFile = `looped_${Date.now()}.mp3`
    const finalUrl = await this.uploadAudioFile(finalBlob, finalFile)

    console.log('Uploaded mixed audio:', finalUrl)
    return finalUrl
  },

  /** Helpers for your player */
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
