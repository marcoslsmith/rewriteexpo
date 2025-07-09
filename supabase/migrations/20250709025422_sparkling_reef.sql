/*
  # Fix duplicate policy conflicts

  1. Purpose
     - Drop all existing policies before recreating them
     - Ensure no policy conflicts when applying migrations
     - Fix the "policy already exists" errors

  2. Changes
     - Drop all policies for each table using a DO block
     - Recreate only the necessary policies
     - Ensure clean policy state
*/

-- Drop all existing policies to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
    END LOOP;
    
    -- Drop all policies on manifestations
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'manifestations' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.manifestations';
    END LOOP;
    
    -- Drop all policies on challenges
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'challenges' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.challenges';
    END LOOP;
    
    -- Drop all policies on challenge_progress
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'challenge_progress' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.challenge_progress';
    END LOOP;
    
    -- Drop all policies on notification_schedules
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notification_schedules' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.notification_schedules';
    END LOOP;
    
    -- Drop all policies on audio_sessions if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audio_sessions' AND table_schema = 'public') THEN
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'audio_sessions' AND schemaname = 'public') LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.audio_sessions';
        END LOOP;
    END IF;
    
    -- Drop all policies on audio_files if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audio_files' AND table_schema = 'public') THEN
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'audio_files' AND schemaname = 'public') LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.audio_files';
        END LOOP;
    END IF;
END $$;

-- Recreate all necessary policies

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Manifestations policies
CREATE POLICY "Users can read own manifestations"
  ON manifestations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manifestations"
  ON manifestations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manifestations"
  ON manifestations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manifestations"
  ON manifestations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Challenges policies
CREATE POLICY "Anyone can read active challenges"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Challenge progress policies
CREATE POLICY "Users can read own challenge progress"
  ON challenge_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge progress"
  ON challenge_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge progress"
  ON challenge_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenge progress"
  ON challenge_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Notification schedules policies
CREATE POLICY "Users can read own notification schedules"
  ON notification_schedules
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification schedules"
  ON notification_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification schedules"
  ON notification_schedules
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification schedules"
  ON notification_schedules
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Audio sessions policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audio_sessions' AND table_schema = 'public') THEN
    EXECUTE '
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
        USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can delete own audio sessions"
        ON audio_sessions
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    ';
  END IF;
END $$;

-- Audio files policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audio_files' AND table_schema = 'public') THEN
    EXECUTE '
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
        USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can delete own audio files"
        ON audio_files
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    ';
  END IF;
END $$;