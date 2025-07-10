/*
  # Restore Storage Policies for Audio Files

  1. Storage Buckets
     - Ensure audio-files bucket exists with proper configuration
     - Enable RLS on storage.objects table

  2. Audio Files Bucket Policies
     - INSERT: Users can upload to their own folders (user_id prefix)
     - SELECT: Users can read their own files + public background music
     - UPDATE: Users can update their own files
     - DELETE: Users can delete their own files
     - SELECT (public): Allow access to shared background music files

  3. Security
     - Uses auth.uid() for user-specific access control
     - Allows public access to specific background music files
     - Prevents unauthorized access to user files
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create audio-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-files',
  'audio-files',
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];

-- Drop existing policies to avoid conflicts
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

-- INSERT Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload audio files to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-files' 
  AND auth.uid()::text IS NOT NULL
  AND (
    -- Allow uploads to user's folder (user_id/... or tts/user_id/... or generated/user_id/...)
    name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('tts/' || auth.uid()::text || '/%')
    OR name LIKE ('generated/' || auth.uid()::text || '/%')
  )
);

-- SELECT Policy: Users can read their own files
CREATE POLICY "Users can read their own audio files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio-files'
  AND auth.uid()::text IS NOT NULL
  AND (
    -- Allow access to user's own files
    name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('tts/' || auth.uid()::text || '/%')
    OR name LIKE ('generated/' || auth.uid()::text || '/%')
  )
);

-- UPDATE Policy: Users can update their own files
CREATE POLICY "Users can update their own audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audio-files'
  AND auth.uid()::text IS NOT NULL
  AND (
    -- Allow updates to user's own files
    name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('tts/' || auth.uid()::text || '/%')
    OR name LIKE ('generated/' || auth.uid()::text || '/%')
  )
)
WITH CHECK (
  bucket_id = 'audio-files'
  AND auth.uid()::text IS NOT NULL
  AND (
    -- Ensure updated files stay in user's folder
    name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('tts/' || auth.uid()::text || '/%')
    OR name LIKE ('generated/' || auth.uid()::text || '/%')
  )
);

-- DELETE Policy: Users can delete their own files
CREATE POLICY "Users can delete their own audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-files'
  AND auth.uid()::text IS NOT NULL
  AND (
    -- Allow deletion of user's own files
    name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('tts/' || auth.uid()::text || '/%')
    OR name LIKE ('generated/' || auth.uid()::text || '/%')
  )
);

-- PUBLIC SELECT Policy: Allow public access to background music files
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
  )
);

-- Verify policies are created
DO $$
BEGIN
  -- Check if all policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload audio files to their folder'
  ) THEN
    RAISE EXCEPTION 'Failed to create upload policy for audio-files bucket';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public access to background music files'
  ) THEN
    RAISE EXCEPTION 'Failed to create public access policy for background music files';
  END IF;

  RAISE NOTICE 'Storage policies for audio-files bucket created successfully';
END $$;