/*
  # Fix audio storage policies for public access

  1. Storage Policies
    - Allow public read access to background audio files in audio-files bucket
    - Allow authenticated users to upload TTS audio files
    - Remove restrictive user-based policies for shared assets

  2. Background Audio Files
    - Enable public access to nature_sounds.mp3, meditation_bells.mp3, ambient_waves.mp3
    - Files should be accessible without authentication

  3. TTS Audio Files
    - Allow authenticated users to upload to tts/ subfolder
    - Allow users to read their own TTS files
*/

-- Drop existing restrictive policies for audio-files bucket
DROP POLICY IF EXISTS "Users can read own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio files" ON storage.objects;

-- Create new policies for audio-files bucket

-- Allow public read access to background music files (shared assets)
CREATE POLICY "Public read access to background audio files"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'audio-files' 
  AND name IN ('nature_sounds.mp3', 'meditation_bells.mp3', 'ambient_waves.mp3')
);

-- Allow authenticated users to upload TTS audio files to tts/ subfolder
CREATE POLICY "Authenticated users can upload TTS audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-files' 
  AND name LIKE 'tts/%'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow authenticated users to read their own TTS audio files
CREATE POLICY "Users can read own TTS audio files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio-files' 
  AND name LIKE 'tts/%'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow authenticated users to delete their own TTS audio files
CREATE POLICY "Users can delete own TTS audio files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-files' 
  AND name LIKE 'tts/%'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Ensure the audio-files bucket exists and is configured properly
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;