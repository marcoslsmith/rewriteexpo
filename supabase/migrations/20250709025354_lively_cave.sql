/*
  # Fix Challenges Schema

  1. Purpose
     - Update challenges table to use text IDs instead of UUIDs
     - Ensure challenge_progress references the correct challenge ID type
     - Fix foreign key constraints and references

  2. Changes
     - Alter challenges table to use text primary key
     - Update challenge_progress foreign key to reference text ID
     - Recreate indexes and constraints as needed
*/

-- First, drop the foreign key constraint in challenge_progress
ALTER TABLE IF EXISTS challenge_progress 
  DROP CONSTRAINT IF EXISTS challenge_progress_challenge_id_fkey;

-- Drop the existing challenges table if it exists
DROP TABLE IF EXISTS challenges CASCADE;

-- Create challenges table with text ID
CREATE TABLE challenges (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  duration integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Alter challenge_progress to use text for challenge_id
ALTER TABLE challenge_progress 
  ALTER COLUMN challenge_id TYPE text USING challenge_id::text;

-- Add foreign key constraint back
ALTER TABLE challenge_progress
  ADD CONSTRAINT challenge_progress_challenge_id_fkey 
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE;

-- Insert default challenges
INSERT INTO challenges (id, title, description, duration) VALUES
  ('gratitude-7', '7-Day Gratitude Journey', 'Transform your mindset with daily gratitude practice', 7),
  ('manifestation-21', '21-Day Manifestation Mastery', 'Build powerful manifestation habits over 21 days', 21),
  ('abundance-14', '14-Day Abundance Mindset', 'Shift into an abundance mindset in just 2 weeks', 14),
  ('mindfulness-10', '10-Day Mindfulness Reset', 'Cultivate present-moment awareness and inner peace', 10),
  ('confidence-14', '14-Day Confidence Builder', 'Build unshakeable self-confidence and self-worth', 14),
  ('creativity-7', '7-Day Creative Flow', 'Unlock your creative potential and artistic expression', 7)
ON CONFLICT (id) DO NOTHING;

-- Recreate challenge_progress unique constraint
ALTER TABLE challenge_progress 
  DROP CONSTRAINT IF EXISTS challenge_progress_user_id_challenge_id_key;

ALTER TABLE challenge_progress 
  ADD CONSTRAINT challenge_progress_user_id_challenge_id_key 
  UNIQUE(user_id, challenge_id);

-- Ensure RLS is enabled
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Recreate challenges policy
DROP POLICY IF EXISTS "Anyone can read active challenges" ON challenges;
CREATE POLICY "Anyone can read active challenges"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (is_active = true);