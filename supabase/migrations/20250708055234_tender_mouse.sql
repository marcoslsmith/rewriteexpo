/*
  # Add seamless audio looping support

  1. Updates
     - Add looping configuration fields to audio_sessions table
     - Add audio sequence metadata for proper looping
     - Update RPC functions to handle looping parameters

  2. New Features
     - Seamless loop configuration
     - Audio sequence metadata storage
     - Background music looping settings
*/

-- Add looping configuration columns to audio_sessions
DO $$
BEGIN
  -- Add seamless_loop column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audio_sessions' AND column_name = 'seamless_loop'
  ) THEN
    ALTER TABLE audio_sessions ADD COLUMN seamless_loop boolean DEFAULT true;
  END IF;

  -- Add sequence_metadata column for storing loop configuration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audio_sessions' AND column_name = 'sequence_metadata'
  ) THEN
    ALTER TABLE audio_sessions ADD COLUMN sequence_metadata jsonb DEFAULT '{}';
  END IF;

  -- Add background_music_config column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audio_sessions' AND column_name = 'background_music_config'
  ) THEN
    ALTER TABLE audio_sessions ADD COLUMN background_music_config jsonb DEFAULT '{}';
  END IF;
END $$;

-- Update the create_audio_session function to include looping parameters
CREATE OR REPLACE FUNCTION create_audio_session(
  p_title text,
  p_manifestation_ids uuid[],
  p_duration_minutes integer,
  p_music_style text,
  p_seamless_loop boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_session_id uuid;
  v_sequence_metadata jsonb;
  v_background_config jsonb;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create sequence metadata for looping
  v_sequence_metadata := jsonb_build_object(
    'target_duration_minutes', p_duration_minutes,
    'target_duration_seconds', p_duration_minutes * 60,
    'manifestation_count', array_length(p_manifestation_ids, 1),
    'estimated_clip_duration', 12,
    'seamless_transitions', p_seamless_loop,
    'crossfade_duration', 0.5
  );

  -- Create background music configuration
  v_background_config := jsonb_build_object(
    'style', p_music_style,
    'loop', true,
    'volume', 0.3,
    'fade_in', 2.0,
    'fade_out', 2.0
  );

  -- Insert new audio session with looping configuration
  INSERT INTO audio_sessions (
    user_id,
    title,
    manifestation_ids,
    duration_minutes,
    music_style,
    seamless_loop,
    sequence_metadata,
    background_music_config,
    status
  )
  VALUES (
    v_user_id,
    p_title,
    p_manifestation_ids,
    p_duration_minutes,
    p_music_style,
    p_seamless_loop,
    v_sequence_metadata,
    v_background_config,
    'pending'
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- Update the get_user_audio_sessions function to include looping info
CREATE OR REPLACE FUNCTION get_user_audio_sessions(
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  manifestation_ids uuid[],
  duration_minutes integer,
  music_style text,
  seamless_loop boolean,
  sequence_metadata jsonb,
  background_music_config jsonb,
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

  -- Return user's audio sessions with looping configuration
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.manifestation_ids,
    s.duration_minutes,
    s.music_style,
    COALESCE(s.seamless_loop, true) as seamless_loop,
    COALESCE(s.sequence_metadata, '{}'::jsonb) as sequence_metadata,
    COALESCE(s.background_music_config, '{}'::jsonb) as background_music_config,
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
  LIMIT p_limit;
END;
$$;

-- Function to calculate optimal loop count for target duration
CREATE OR REPLACE FUNCTION calculate_loop_count(
  manifestation_count integer,
  target_duration_minutes integer,
  estimated_clip_duration integer DEFAULT 12
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  target_seconds integer;
  sequence_duration integer;
  loop_count integer;
BEGIN
  target_seconds := target_duration_minutes * 60;
  sequence_duration := manifestation_count * estimated_clip_duration;
  
  IF sequence_duration <= 0 THEN
    RETURN 1;
  END IF;
  
  loop_count := CEIL(target_seconds::float / sequence_duration::float);
  
  -- Ensure at least 1 loop
  RETURN GREATEST(loop_count, 1);
END;
$$;

-- Function to get audio session configuration for playback
CREATE OR REPLACE FUNCTION get_audio_playback_config(session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_config jsonb;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get the playback configuration
  SELECT jsonb_build_object(
    'session_id', s.id,
    'title', s.title,
    'duration_minutes', s.duration_minutes,
    'duration_seconds', s.duration_minutes * 60,
    'music_style', s.music_style,
    'seamless_loop', COALESCE(s.seamless_loop, true),
    'manifestation_count', array_length(s.manifestation_ids, 1),
    'sequence_metadata', COALESCE(s.sequence_metadata, '{}'::jsonb),
    'background_music_config', COALESCE(s.background_music_config, '{}'::jsonb),
    'audio_url', s.audio_url,
    'status', s.status,
    'loop_count', calculate_loop_count(
      array_length(s.manifestation_ids, 1), 
      s.duration_minutes
    )
  )
  INTO v_config
  FROM audio_sessions s
  WHERE s.id = session_id AND s.user_id = v_user_id;

  IF v_config IS NULL THEN
    RAISE EXCEPTION 'Audio session not found or access denied';
  END IF;

  RETURN v_config;
END;
$$;

-- Update existing audio sessions to have default looping configuration
UPDATE audio_sessions 
SET 
  seamless_loop = true,
  sequence_metadata = jsonb_build_object(
    'target_duration_minutes', duration_minutes,
    'target_duration_seconds', duration_minutes * 60,
    'manifestation_count', array_length(manifestation_ids, 1),
    'estimated_clip_duration', 12,
    'seamless_transitions', true,
    'crossfade_duration', 0.5
  ),
  background_music_config = jsonb_build_object(
    'style', music_style,
    'loop', true,
    'volume', 0.3,
    'fade_in', 2.0,
    'fade_out', 2.0
  )
WHERE seamless_loop IS NULL OR sequence_metadata = '{}' OR background_music_config = '{}';