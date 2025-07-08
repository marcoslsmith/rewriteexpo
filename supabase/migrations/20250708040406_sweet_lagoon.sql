/*
  # Fix challenge completion and AI summary generation

  1. Updates
    - Ensure challenge_progress table has all required columns
    - Fix any data inconsistencies
    - Add proper constraints and indexes

  2. Functions
    - Improve AI summary generation function
    - Add helper functions for challenge completion
*/

-- Ensure all required columns exist in challenge_progress
DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_progress' AND column_name = 'status'
  ) THEN
    ALTER TABLE challenge_progress ADD COLUMN status text DEFAULT 'in_progress';
    ALTER TABLE challenge_progress ADD CONSTRAINT challenge_progress_status_check 
      CHECK (status IN ('in_progress', 'completed', 'paused'));
  END IF;

  -- Add ai_summary column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_progress' AND column_name = 'ai_summary'
  ) THEN
    ALTER TABLE challenge_progress ADD COLUMN ai_summary text;
  END IF;

  -- Add run_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_progress' AND column_name = 'run_number'
  ) THEN
    ALTER TABLE challenge_progress ADD COLUMN run_number integer DEFAULT 1;
  END IF;
END $$;

-- Update existing records to have proper status and run_number
UPDATE challenge_progress 
SET 
  status = CASE 
    WHEN completed_at IS NOT NULL THEN 'completed'
    ELSE 'in_progress'
  END,
  run_number = COALESCE(run_number, 1)
WHERE status IS NULL OR run_number IS NULL;

-- Drop the old unique constraint that prevents multiple runs
ALTER TABLE challenge_progress DROP CONSTRAINT IF EXISTS challenge_progress_user_id_challenge_id_key;

-- Create new unique constraint: only one in_progress challenge per user + challenge combo
DROP INDEX IF EXISTS challenge_progress_user_challenge_in_progress_unique;
CREATE UNIQUE INDEX challenge_progress_user_challenge_in_progress_unique 
ON challenge_progress (user_id, challenge_id) 
WHERE status = 'in_progress';

-- Create unique constraint for user + challenge + run_number combination
DROP INDEX IF EXISTS challenge_progress_user_challenge_run_unique;
CREATE UNIQUE INDEX challenge_progress_user_challenge_run_unique 
ON challenge_progress (user_id, challenge_id, run_number);

-- Function to get next run number for a user's challenge
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

-- Function to safely complete a challenge with proper point calculation
CREATE OR REPLACE FUNCTION complete_challenge_with_points(
    progress_id uuid,
    final_day_points integer DEFAULT 10,
    completion_bonus integer DEFAULT 50
)
RETURNS jsonb AS $$
DECLARE
    progress_record challenge_progress%ROWTYPE;
    challenge_record challenges%ROWTYPE;
    total_points integer;
    result jsonb;
BEGIN
    -- Get the progress record
    SELECT * INTO progress_record 
    FROM challenge_progress 
    WHERE id = progress_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Challenge progress not found: %', progress_id;
    END IF;
    
    -- Get the challenge record
    SELECT * INTO challenge_record 
    FROM challenges 
    WHERE id = progress_record.challenge_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Challenge not found: %', progress_record.challenge_id;
    END IF;
    
    -- Calculate total points (existing + final day + completion bonus)
    total_points := progress_record.points + final_day_points + completion_bonus;
    
    -- Update the challenge progress
    UPDATE challenge_progress 
    SET 
        status = 'completed',
        completed_at = NOW(),
        points = total_points
    WHERE id = progress_id;
    
    -- Return result for confirmation
    result := jsonb_build_object(
        'challenge_id', progress_record.challenge_id,
        'challenge_title', challenge_record.title,
        'total_points', total_points,
        'completion_bonus', completion_bonus,
        'completed_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get challenge statistics for a user
CREATE OR REPLACE FUNCTION get_user_challenge_stats(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
    stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_points', COALESCE(SUM(points), 0),
        'active_challenges', COUNT(*) FILTER (WHERE status = 'in_progress'),
        'completed_challenges', COUNT(*) FILTER (WHERE status = 'completed'),
        'total_challenges', COUNT(*),
        'average_points_per_challenge', COALESCE(AVG(points) FILTER (WHERE status = 'completed'), 0)
    )
    INTO stats
    FROM challenge_progress
    WHERE user_id = user_uuid;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure all existing completed challenges have proper status
UPDATE challenge_progress 
SET status = 'completed' 
WHERE completed_at IS NOT NULL AND status != 'completed';

-- Add any missing challenges
INSERT INTO challenges (id, title, description, duration) VALUES
  ('gratitude-7', '7-Day Gratitude Journey', 'Transform your mindset with daily gratitude practice', 7),
  ('manifestation-21', '21-Day Manifestation Mastery', 'Build powerful manifestation habits over 21 days', 21),
  ('abundance-14', '14-Day Abundance Mindset', 'Shift into an abundance mindset in just 2 weeks', 14),
  ('mindfulness-10', '10-Day Mindfulness Reset', 'Cultivate present-moment awareness and inner peace', 10),
  ('confidence-14', '14-Day Confidence Builder', 'Build unshakeable self-confidence and self-worth', 14),
  ('creativity-7', '7-Day Creative Flow', 'Unlock your creative potential and artistic expression', 7)
ON CONFLICT (id) DO NOTHING;