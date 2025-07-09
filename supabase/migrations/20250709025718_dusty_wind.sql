-- Drop existing policies individually
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can read own manifestations" ON manifestations;
DROP POLICY IF EXISTS "Users can insert own manifestations" ON manifestations;
DROP POLICY IF EXISTS "Users can update own manifestations" ON manifestations;
DROP POLICY IF EXISTS "Users can delete own manifestations" ON manifestations;

DROP POLICY IF EXISTS "Anyone can read active challenges" ON challenges;

DROP POLICY IF EXISTS "Users can read own challenge progress" ON challenge_progress;
DROP POLICY IF EXISTS "Users can insert own challenge progress" ON challenge_progress;
DROP POLICY IF EXISTS "Users can update own challenge progress" ON challenge_progress;
DROP POLICY IF EXISTS "Users can delete own challenge progress" ON challenge_progress;

DROP POLICY IF EXISTS "Users can read own notification schedules" ON notification_schedules;
DROP POLICY IF EXISTS "Users can insert own notification schedules" ON notification_schedules;
DROP POLICY IF EXISTS "Users can update own notification schedules" ON notification_schedules;
DROP POLICY IF EXISTS "Users can delete own notification schedules" ON notification_schedules;

-- Drop audio-related policies if tables exist
DROP POLICY IF EXISTS "Users can read own audio sessions" ON audio_sessions;
DROP POLICY IF EXISTS "Users can insert own audio sessions" ON audio_sessions;
DROP POLICY IF EXISTS "Users can update own audio sessions" ON audio_sessions;
DROP POLICY IF EXISTS "Users can delete own audio sessions" ON audio_sessions;

DROP POLICY IF EXISTS "Users can read own audio files" ON audio_files;
DROP POLICY IF EXISTS "Users can insert own audio files" ON audio_files;
DROP POLICY IF EXISTS "Users can update own audio files" ON audio_files;
DROP POLICY IF EXISTS "Users can delete own audio files" ON audio_files;

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

-- Audio sessions policies (conditionally applied)
CREATE POLICY IF EXISTS "Users can read own audio sessions"
  ON audio_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY IF EXISTS "Users can insert own audio sessions"
  ON audio_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF EXISTS "Users can update own audio sessions"
  ON audio_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY IF EXISTS "Users can delete own audio sessions"
  ON audio_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Audio files policies (conditionally applied)
CREATE POLICY IF EXISTS "Users can read own audio files"
  ON audio_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY IF EXISTS "Users can insert own audio files"
  ON audio_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF EXISTS "Users can update own audio files"
  ON audio_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY IF EXISTS "Users can delete own audio files"
  ON audio_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);