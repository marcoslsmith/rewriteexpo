/*
  # Audio Feature Infrastructure Setup

  1. New Tables
    - `audio_sessions` - Store generated audio session metadata
    - `audio_files` - Track individual audio files and their cache status

  2. Storage
    - Create audio-files bucket for storing generated audio
    - Set up proper RLS policies for audio access

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own audio data
*/

-- Create audio_sessions table to track generated audio sessions
CREATE TABLE IF NOT EXISTS audio_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Personalized Audio Session',
  manifestation_ids uuid[] NOT NULL,
  duration_minutes integer NOT NULL,
  music_style text NOT NULL,
  audio_url text,
  file_size bigint,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create audio_files table to cache individual TTS audio files
CREATE TABLE IF NOT EXISTS audio_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  manifestation_id uuid REFERENCES manifestations(id) ON DELETE CASCADE,
  text_hash text NOT NULL, -- Hash of the manifestation text for caching
  audio_url text NOT NULL,
  file_size bigint,
  voice_model text DEFAULT 'nova',
  tts_model text DEFAULT 'tts-1',
  created_at timestamptz DEFAULT now(),
  UNIQUE(text_hash, voice_model, tts_model)
);

-- Enable Row Level Security
ALTER TABLE audio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

-- Audio sessions policies
CREATE POLICY "Users can read own audio sessions"
  ON audio_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio sessions"
  ON audio_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio sessions"
  ON audio_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio sessions"
  ON audio_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Audio files policies
CREATE POLICY "Users can read own audio files"
  ON audio_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio files"
  ON audio_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio files"
  ON audio_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio files"
  ON audio_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp for audio_sessions
CREATE TRIGGER update_audio_sessions_updated_at
  BEFORE UPDATE ON audio_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate text hash for caching
CREATE OR REPLACE FUNCTION generate_text_hash(input_text text)
RETURNS text AS $$
BEGIN
  RETURN encode(digest(input_text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get cached audio file for a manifestation
CREATE OR REPLACE FUNCTION get_cached_audio_file(
  manifestation_text text,
  voice_model text DEFAULT 'nova',
  tts_model text DEFAULT 'tts-1'
)
RETURNS TABLE(
  audio_url text,
  file_size bigint,
  created_at timestamptz
) AS $$
DECLARE
  text_hash text;
BEGIN
  text_hash := generate_text_hash(manifestation_text);
  
  RETURN QUERY
  SELECT af.audio_url, af.file_size, af.created_at
  FROM audio_files af
  WHERE af.text_hash = text_hash
    AND af.voice_model = get_cached_audio_file.voice_model
    AND af.tts_model = get_cached_audio_file.tts_model
    AND af.user_id = auth.uid()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save audio file to cache
CREATE OR REPLACE FUNCTION save_audio_file_cache(
  manifestation_id uuid,
  manifestation_text text,
  audio_url text,
  file_size bigint DEFAULT NULL,
  voice_model text DEFAULT 'nova',
  tts_model text DEFAULT 'tts-1'
)
RETURNS uuid AS $$
DECLARE
  text_hash text;
  audio_file_id uuid;
BEGIN
  text_hash := generate_text_hash(manifestation_text);
  
  INSERT INTO audio_files (
    user_id,
    manifestation_id,
    text_hash,
    audio_url,
    file_size,
    voice_model,
    tts_model
  ) VALUES (
    auth.uid(),
    manifestation_id,
    text_hash,
    audio_url,
    file_size,
    voice_model,
    tts_model
  )
  ON CONFLICT (text_hash, voice_model, tts_model) 
  DO UPDATE SET
    audio_url = EXCLUDED.audio_url,
    file_size = EXCLUDED.file_size,
    created_at = now()
  RETURNING id INTO audio_file_id;
  
  RETURN audio_file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new audio session
CREATE OR REPLACE FUNCTION create_audio_session(
  session_title text,
  manifestation_ids uuid[],
  duration_minutes integer,
  music_style text
)
RETURNS uuid AS $$
DECLARE
  session_id uuid;
BEGIN
  INSERT INTO audio_sessions (
    user_id,
    title,
    manifestation_ids,
    duration_minutes,
    music_style,
    status
  ) VALUES (
    auth.uid(),
    session_title,
    manifestation_ids,
    duration_minutes,
    music_style,
    'pending'
  )
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update audio session status
CREATE OR REPLACE FUNCTION update_audio_session_status(
  session_id uuid,
  new_status text,
  audio_url text DEFAULT NULL,
  file_size bigint DEFAULT NULL,
  error_message text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE audio_sessions 
  SET 
    status = new_status,
    audio_url = COALESCE(update_audio_session_status.audio_url, audio_sessions.audio_url),
    file_size = COALESCE(update_audio_session_status.file_size, audio_sessions.file_size),
    error_message = COALESCE(update_audio_session_status.error_message, audio_sessions.error_message),
    completed_at = CASE 
      WHEN new_status = 'completed' THEN now() 
      ELSE audio_sessions.completed_at 
    END,
    updated_at = now()
  WHERE id = session_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's audio session history
CREATE OR REPLACE FUNCTION get_user_audio_sessions(limit_count integer DEFAULT 10)
RETURNS TABLE(
  session_id uuid,
  title text,
  manifestation_count integer,
  duration_minutes integer,
  music_style text,
  status text,
  audio_url text,
  file_size bigint,
  created_at timestamptz,
  completed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    array_length(a.manifestation_ids, 1) as manifestation_count,
    a.duration_minutes,
    a.music_style,
    a.status,
    a.audio_url,
    a.file_size,
    a.created_at,
    a.completed_at
  FROM audio_sessions a
  WHERE a.user_id = auth.uid()
  ORDER BY a.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audio files (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_audio_files(days_old integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM audio_files 
  WHERE created_at < (now() - interval '1 day' * days_old)
  AND user_id = auth.uid();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;