/*
  # Initial Schema for The Rewrite App

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `email` (text)
      - `display_name` (text)
      - `username` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `manifestations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `original_entry` (text)
      - `transformed_text` (text)
      - `is_favorite` (boolean)
      - `tags` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `challenges`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `duration` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamp)
    
    - `challenge_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `challenge_id` (uuid, references challenges)
      - `current_day` (integer)
      - `completed_days` (integer array)
      - `responses` (jsonb)
      - `points` (integer)
      - `streak` (integer)
      - `start_date` (timestamp)
      - `completed_at` (timestamp, nullable)
      - `created_at` (timestamp)
    
    - `notification_schedules`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `message` (text)
      - `use_random_manifestation` (boolean)
      - `time` (text)
      - `days` (integer array)
      - `is_active` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public read access to challenges
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  username text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create manifestations table
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

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  duration integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create challenge_progress table
CREATE TABLE IF NOT EXISTS challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  current_day integer DEFAULT 1,
  completed_days integer[] DEFAULT '{}',
  responses jsonb DEFAULT '{}',
  points integer DEFAULT 0,
  streak integer DEFAULT 0,
  start_date timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Create notification_schedules table
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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
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
END $$;

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

-- Challenges policies (public read, admin write)
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

-- Insert default challenges
INSERT INTO challenges (id, title, description, duration) VALUES
  ('gratitude-7', '7-Day Gratitude Journey', 'Transform your mindset with daily gratitude practice', 7),
  ('manifestation-21', '21-Day Manifestation Mastery', 'Build powerful manifestation habits over 21 days', 21),
  ('abundance-14', '14-Day Abundance Mindset', 'Shift into an abundance mindset in just 2 weeks', 14)
ON CONFLICT (id) DO NOTHING;

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_manifestations_updated_at ON manifestations;
CREATE TRIGGER update_manifestations_updated_at
  BEFORE UPDATE ON manifestations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();