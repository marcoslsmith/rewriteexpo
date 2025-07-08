/*
  # Fix ambiguous column reference in save_audio_file_cache function

  1. Updates
    - Drop and recreate `save_audio_file_cache` function with proper column references
    - Drop and recreate `get_cached_audio_file` function with proper column references
    - Ensure all column references are unambiguous by using proper table aliases

  2. Security
    - Maintains existing RLS policies
    - Preserves function security context
*/

-- Drop existing functions to recreate them with fixed column references
DROP FUNCTION IF EXISTS save_audio_file_cache(uuid, text, text, bigint, text, text);
DROP FUNCTION IF EXISTS get_cached_audio_file(text, text, text);

-- Create save_audio_file_cache function with unambiguous column references
CREATE OR REPLACE FUNCTION save_audio_file_cache(
  p_manifestation_id uuid DEFAULT NULL,
  p_text_hash text,
  p_audio_url text,
  p_file_size bigint DEFAULT NULL,
  p_voice_model text DEFAULT 'nova',
  p_tts_model text DEFAULT 'tts-1'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_audio_file_id uuid;
  v_text_hash_to_use text;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Generate text hash if not provided
  v_text_hash_to_use := COALESCE(p_text_hash, encode(digest(p_audio_url, 'sha256'), 'hex'));

  -- Insert or update audio file cache
  INSERT INTO audio_files (
    user_id,
    manifestation_id,
    text_hash,
    audio_url,
    file_size,
    voice_model,
    tts_model
  )
  VALUES (
    v_user_id,
    p_manifestation_id,
    v_text_hash_to_use,
    p_audio_url,
    p_file_size,
    p_voice_model,
    p_tts_model
  )
  ON CONFLICT (text_hash, voice_model, tts_model) 
  DO UPDATE SET
    audio_url = EXCLUDED.audio_url,
    file_size = EXCLUDED.file_size,
    user_id = EXCLUDED.user_id,
    manifestation_id = EXCLUDED.manifestation_id
  RETURNING id INTO v_audio_file_id;

  RETURN v_audio_file_id;
END;
$$;

-- Create get_cached_audio_file function with unambiguous column references
CREATE OR REPLACE FUNCTION get_cached_audio_file(
  p_text_hash text,
  p_voice_model text DEFAULT 'nova',
  p_tts_model text DEFAULT 'tts-1'
)
RETURNS TABLE (
  id uuid,
  audio_url text,
  file_size bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_text_hash_to_use text;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Generate text hash if needed
  v_text_hash_to_use := p_text_hash;

  -- Return cached audio file if it exists
  RETURN QUERY
  SELECT 
    af.id,
    af.audio_url,
    af.file_size,
    af.created_at
  FROM audio_files af
  WHERE af.user_id = v_user_id
    AND af.text_hash = v_text_hash_to_use
    AND af.voice_model = p_voice_model
    AND af.tts_model = p_tts_model
  ORDER BY af.created_at DESC
  LIMIT 1;
END;
$$;

-- Create additional helper functions for audio session management
CREATE OR REPLACE FUNCTION create_audio_session(
  p_session_title text,
  p_manifestation_ids uuid[],
  p_duration_minutes integer,
  p_music_style text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_session_id uuid;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Insert new audio session
  INSERT INTO audio_sessions (
    user_id,
    title,
    manifestation_ids,
    duration_minutes,
    music_style,
    status
  )
  VALUES (
    v_user_id,
    p_session_title,
    p_manifestation_ids,
    p_duration_minutes,
    p_music_style,
    'pending'
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- Create function to update audio session status
CREATE OR REPLACE FUNCTION update_audio_session_status(
  p_session_id uuid,
  p_new_status text,
  p_audio_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Update audio session
  UPDATE audio_sessions 
  SET 
    status = p_new_status,
    audio_url = COALESCE(p_audio_url, audio_url),
    updated_at = now(),
    completed_at = CASE 
      WHEN p_new_status = 'completed' THEN now() 
      ELSE completed_at 
    END
  WHERE id = p_session_id 
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audio session not found or access denied';
  END IF;
END;
$$;

-- Create function to get user's audio sessions
CREATE OR REPLACE FUNCTION get_user_audio_sessions(
  p_limit_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  manifestation_ids uuid[],
  duration_minutes integer,
  music_style text,
  audio_url text,
  file_size bigint,
  status text,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz,
  completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Return user's audio sessions
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.manifestation_ids,
    s.duration_minutes,
    s.music_style,
    s.audio_url,
    s.file_size,
    s.status,
    s.error_message,
    s.created_at,
    s.updated_at,
    s.completed_at
  FROM audio_sessions s
  WHERE s.user_id = v_user_id
  ORDER BY s.created_at DESC
  LIMIT p_limit_count;
END;
$$;