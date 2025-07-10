/*
  # Fix Audio Storage Policies

  1. Purpose
     - Ensure proper access to background music files
     - Fix user-specific audio file policies
     - Enable public access to shared background music

  2. Changes
     - Update storage policies for audio-files bucket
     - Ensure background music files are publicly accessible
     - Maintain user-specific access for generated content
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Ensure audio-files bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-files',
  'audio-files',
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'application/octet-stream'];

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can upload audio files to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Public access to background music files" ON storage.objects;
DROP POLICY IF EXISTS "audio_files_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "audio_files_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "audio_files_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "audio_files_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "audio_files_public_select_policy" ON storage.objects;

-- PUBLIC SELECT Policy: Allow unrestricted public access to background music files
CREATE POLICY "Public access to background music files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'audio-files'
  AND (
    -- Allow access to specific background music files in root
    name IN ('nature_sounds.mp3', 'meditation_bells.mp3', 'ambient_waves.mp3')
    OR name LIKE 'background_music/%'
    OR name LIKE 'shared/%'
  )
);

-- INSERT Policy: Authenticated users can upload files to their own folders
CREATE POLICY "Users can upload audio files to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-files' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow uploads to user's folder structures
    name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('tts/' || auth.uid()::text || '/%')
    OR name LIKE ('generated/' || auth.uid()::text || '/%')
  )
);

-- SELECT Policy: Authenticated users can read their own files
CREATE POLICY "Users can read their own audio files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio-files'
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow access to user's own files
    name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('tts/' || auth.uid()::text || '/%')
    OR name LIKE ('generated/' || auth.uid()::text || '/%')
  )
);

-- UPDATE Policy: Authenticated users can update their own files
CREATE POLICY "Users can update their own audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audio-files'
  AND auth.uid() IS NOT NULL
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('tts/' || auth.uid()::text || '/%')
    OR name LIKE ('generated/' || auth.uid()::text || '/%')
  )
)
WITH CHECK (
  bucket_id = 'audio-files'
  AND auth.uid() IS NOT NULL
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('tts/' || auth.uid()::text || '/%')
    OR name LIKE ('generated/' || auth.uid()::text || '/%')
  )
);

-- DELETE Policy: Authenticated users can delete their own files
CREATE POLICY "Users can delete their own audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-files'
  AND auth.uid() IS NOT NULL
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('tts/' || auth.uid()::text || '/%')
    OR name LIKE ('generated/' || auth.uid()::text || '/%')
  )
);

-- Verify the bucket and policies are properly configured
DO $$
DECLARE
  bucket_exists boolean;
  policy_count integer;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'audio-files'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    RAISE EXCEPTION 'audio-files bucket was not created properly';
  END IF;
  
  -- Check if policies were created
  SELECT COUNT(*) FROM pg_policies 
  WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%audio%'
  INTO policy_count;
  
  IF policy_count < 5 THEN
    RAISE EXCEPTION 'Not all audio storage policies were created. Found: %', policy_count;
  END IF;
  
  RAISE NOTICE 'Audio storage bucket and policies configured successfully. Policies created: %', policy_count;
END $$;