/*
  # Initial Schema for The Rewrite App
  
  This is a clean base migration that sets up the complete database schema
  to match the production state without any duplicate policies.

  1. Tables
    - profiles: User profile information
    - manifestations: User journal entries and AI transformations
    - challenges: Available challenge programs
    - challenge_progress: User progress tracking with replay support
    - notification_schedules: User notification preferences
    - audio_sessions: Generated audio session metadata
    - audio_files: Individual audio file cache

  2. Security
    - Enable RLS on all tables
    - Create policies for authenticated users to manage their own data
    - Public read access for challenges

  3. Functions & Triggers
    - Auto-create profile on user signup
    - Auto-update timestamps
    - Challenge completion and AI summary generation
    - Audio session management
    - Default notification schedule creation

  4. Storage
    - Audio file storage buckets with proper policies
*/

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  username text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Manifestations table
CREATE TABLE IF NOT EXISTS manifestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  original_entry text NOT NULL,
  transformed_text text NOT NULL,
  is_favorite boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  duration integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Challenge progress table with replay support
CREATE TABLE IF NOT EXISTS challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id text REFERENCES challenges(id) ON DELETE CASCADE,
  current_day integer DEFAULT 1,
  completed_days integer[] DEFAULT '{}',
  responses jsonb DEFAULT '{}',
  points integer DEFAULT 0,
  streak integer DEFAULT 0,
  start_date timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused')),
  ai_summary text,
  run_number integer DEFAULT 1
);

-- Notification schedules table
CREATE TABLE IF NOT EXISTS notification_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text DEFAULT '',
  use_random_manifestation boolean DEFAULT true,
  time text NOT NULL,
  days integer[] NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Audio sessions table
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
  completed_at timestamptz,
  seamless_loop boolean DEFAULT true,
  sequence_metadata jsonb DEFAULT '{}',
  background_music_config jsonb DEFAULT '{}'
);

-- Audio files cache table
CREATE TABLE IF NOT EXISTS audio_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  manifestation_id uuid REFERENCES manifestations(id) ON DELETE CASCADE,
  text_hash text NOT NULL,
  audio_url text NOT NULL,
  file_size bigint,
  voice_model text DEFAULT 'nova',
  tts_model text DEFAULT 'tts-1',
  created_at timestamptz DEFAULT now(),
  UNIQUE(text_hash, voice_model, tts_model)
);

-- =====================================================
-- INDEXES AND CONSTRAINTS
-- =====================================================

-- Challenge progress constraints
CREATE UNIQUE INDEX IF NOT EXISTS challenge_progress_user_challenge_in_progress_unique 
ON challenge_progress (user_id, challenge_id) 
WHERE status = 'in_progress';

CREATE UNIQUE INDEX IF NOT EXISTS challenge_progress_user_challenge_run_unique 
ON challenge_progress (user_id, challenge_id, run_number);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES (No duplicates)
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Manifestations policies
CREATE POLICY "Users can read own manifestations"
  ON manifestations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manifestations"
  ON manifestations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manifestations"
  ON manifestations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manifestations"
  ON manifestations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Challenges policies
CREATE POLICY "Anyone can read active challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Challenge progress policies
CREATE POLICY "Users can read own challenge progress"
  ON challenge_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge progress"
  ON challenge_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge progress"
  ON challenge_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenge progress"
  ON challenge_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Notification schedules policies
CREATE POLICY "Users can read own notification schedules"
  ON notification_schedules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification schedules"
  ON notification_schedules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification schedules"
  ON notification_schedules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification schedules"
  ON notification_schedules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Audio sessions policies
CREATE POLICY "Users can read own audio sessions"
  ON audio_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio sessions"
  ON audio_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio sessions"
  ON audio_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio sessions"
  ON audio_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Audio files policies
CREATE POLICY "Users can read own audio files"
  ON audio_files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio files"
  ON audio_files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio files"
  ON audio_files FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio files"
  ON audio_files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Audio files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-files',
  'audio-files',
  false,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
) ON CONFLICT (id) DO NOTHING;

-- TTS cache bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts-cache',
  'tts-cache',
  false,
  10485760, -- 10MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Audio files storage policies
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

-- TTS cache storage policies
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

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create default notification schedules
CREATE OR REPLACE FUNCTION create_default_schedules_for_user(user_uuid uuid)
RETURNS void AS $$
DECLARE
    schedule_count INTEGER;
BEGIN
    -- Check if user already has schedules
    SELECT COUNT(*) INTO schedule_count 
    FROM notification_schedules 
    WHERE user_id = user_uuid;
    
    -- Only create if no schedules exist
    IF schedule_count = 0 THEN
        -- Insert default morning schedule
        INSERT INTO notification_schedules (
            user_id,
            title,
            message,
            use_random_manifestation,
            time,
            days,
            is_active
        ) VALUES (
            user_uuid,
            'Good Morning Motivation',
            'Good morning! Start your day with intention. What will you manifest today?',
            false,
            '08:00',
            ARRAY[1, 2, 3, 4, 5], -- Monday to Friday
            true
        );

        -- Insert default evening schedule
        INSERT INTO notification_schedules (
            user_id,
            title,
            message,
            use_random_manifestation,
            time,
            days,
            is_active
        ) VALUES (
            user_uuid,
            'Evening Reflection',
            'Time to wind down and reflect on your day. What went well?',
            false,
            '20:00',
            ARRAY[0, 1, 2, 3, 4, 5, 6], -- Every day
            true
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert profile with error handling
    BEGIN
        INSERT INTO public.profiles (id, email, display_name, username, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
            NULL,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Create default notification schedules
    BEGIN
        PERFORM create_default_schedules_for_user(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE WARNING 'Failed to create default schedules for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next run number for challenge replay
CREATE OR REPLACE FUNCTION get_next_run_number(user_uuid uuid, challenge_id_param text)
RETURNS integer AS $$
DECLARE
    max_run integer;
BEGIN
    SELECT COALESCE(MAX(run_number), 0) + 1 
    INTO max_run
    FROM challenge_progress 
    WHERE user_id = user_uuid AND challenge_id = challenge_id_param;
    
    RETURN max_run;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate loop count for audio sessions
CREATE OR REPLACE FUNCTION calculate_loop_count(
  manifestation_count integer,
  target_duration_minutes integer,
  estimated_clip_duration integer DEFAULT 12
)
RETURNS integer AS $$
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
  
  RETURN GREATEST(loop_count, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Audio session management functions
CREATE OR REPLACE FUNCTION create_audio_session(
  p_title text,
  p_manifestation_ids uuid[],
  p_duration_minutes integer,
  p_music_style text,
  p_seamless_loop boolean DEFAULT true
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_session_id uuid;
  v_sequence_metadata jsonb;
  v_background_config jsonb;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create sequence metadata
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_audio_session_status(
  p_session_id uuid,
  p_status text,
  p_audio_url text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  UPDATE audio_sessions 
  SET 
    status = p_status,
    audio_url = COALESCE(p_audio_url, audio_url),
    updated_at = now(),
    completed_at = CASE 
      WHEN p_status = 'completed' THEN now() 
      ELSE completed_at 
    END
  WHERE id = p_session_id 
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audio session not found or access denied';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_audio_sessions(p_limit integer DEFAULT 10)
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
) AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audio file cache functions
CREATE OR REPLACE FUNCTION save_audio_file_cache(
  p_text_hash text,
  p_audio_url text,
  p_manifestation_id uuid DEFAULT NULL,
  p_file_size bigint DEFAULT NULL,
  p_voice_model text DEFAULT 'nova',
  p_tts_model text DEFAULT 'tts-1'
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_audio_file_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

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
    p_text_hash,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
) AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    af.id,
    af.audio_url,
    af.file_size,
    af.created_at
  FROM audio_files af
  WHERE af.user_id = v_user_id
    AND af.text_hash = p_text_hash
    AND af.voice_model = p_voice_model
    AND af.tts_model = p_tts_model
  ORDER BY af.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- User creation trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manifestations_updated_at
  BEFORE UPDATE ON manifestations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_sessions_updated_at
  BEFORE UPDATE ON audio_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default challenges
INSERT INTO challenges (id, title, description, duration) VALUES
  ('gratitude-7', '7-Day Gratitude Journey', 'Transform your mindset with daily gratitude practice', 7),
  ('manifestation-21', '21-Day Manifestation Mastery', 'Build powerful manifestation habits over 21 days', 21),
  ('abundance-14', '14-Day Abundance Mindset', 'Shift into an abundance mindset in just 2 weeks', 14),
  ('mindfulness-10', '10-Day Mindfulness Reset', 'Cultivate present-moment awareness and inner peace', 10),
  ('confidence-14', '14-Day Confidence Builder', 'Build unshakeable self-confidence and self-worth', 14),
  ('creativity-7', '7-Day Creative Flow', 'Unlock your creative potential and artistic expression', 7)
ON CONFLICT (id) DO NOTHING;

-- Create default schedules for existing users who don't have any
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM profiles LOOP
        PERFORM create_default_schedules_for_user(user_record.id);
    END LOOP;
END $$;