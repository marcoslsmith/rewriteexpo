/*
  # Audio Storage Bucket Setup

  1. Storage Buckets
    - Create audio-files bucket for storing generated audio
    - Create tts-cache bucket for caching individual TTS files

  2. Storage Policies
    - Users can upload their own audio files
    - Users can read their own audio files
    - Public access for completed audio sessions (optional)
*/

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-files',
  'audio-files',
  false, -- Private by default
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for TTS cache
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts-cache',
  'tts-cache',
  false, -- Private by default
  10485760, -- 10MB limit per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio-files bucket
CREATE POLICY "Users can upload their own audio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own audio files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own audio files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audio-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own audio files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policies for tts-cache bucket
CREATE POLICY "Users can upload to TTS cache"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tts-cache' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read from TTS cache"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tts-cache' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update TTS cache"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tts-cache' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete from TTS cache"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tts-cache' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Function to generate storage path for user audio files
CREATE OR REPLACE FUNCTION get_user_audio_path(
  user_uuid uuid,
  filename text
)
RETURNS text AS $$
BEGIN
  RETURN user_uuid::text || '/' || filename;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate storage path for TTS cache
CREATE OR REPLACE FUNCTION get_tts_cache_path(
  user_uuid uuid,
  text_hash text,
  voice_model text DEFAULT 'nova'
)
RETURNS text AS $$
BEGIN
  RETURN user_uuid::text || '/tts/' || voice_model || '/' || text_hash || '.mp3';
END;
$$ LANGUAGE plpgsql IMMUTABLE;