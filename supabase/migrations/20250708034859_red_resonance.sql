/*
  # Challenge Replay System with AI Summaries

  1. Schema Changes
    - Remove unique constraint on challenge_progress to allow multiple runs
    - Add status column to track challenge state
    - Add ai_summary column for completion summaries
    - Add run_number to distinguish between multiple attempts

  2. New Constraints
    - Only one in_progress challenge per user + challenge combo
    - Unique constraint on user_id + challenge_id + run_number

  3. Functions
    - Function to generate AI summaries on completion
*/

-- First, drop the existing unique constraint that prevents multiple runs
ALTER TABLE challenge_progress DROP CONSTRAINT IF EXISTS challenge_progress_user_id_challenge_id_key;

-- Add new columns to challenge_progress
DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_progress' AND column_name = 'status'
  ) THEN
    ALTER TABLE challenge_progress ADD COLUMN status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused'));
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
  run_number = 1
WHERE status IS NULL OR run_number IS NULL;

-- Create new unique constraint: only one in_progress challenge per user + challenge combo
CREATE UNIQUE INDEX IF NOT EXISTS challenge_progress_user_challenge_in_progress_unique 
ON challenge_progress (user_id, challenge_id) 
WHERE status = 'in_progress';

-- Create unique constraint for user + challenge + run_number combination
CREATE UNIQUE INDEX IF NOT EXISTS challenge_progress_user_challenge_run_unique 
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

-- Function to generate AI summary when challenge is completed
CREATE OR REPLACE FUNCTION generate_challenge_summary(progress_id uuid)
RETURNS void AS $$
DECLARE
    progress_record challenge_progress%ROWTYPE;
    challenge_record challenges%ROWTYPE;
    summary_prompt text;
    user_responses text;
    response_text text;
    day_num integer;
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
    
    -- Build user responses text
    user_responses := '';
    FOR day_num IN 1..challenge_record.duration LOOP
        response_text := progress_record.responses->>day_num::text;
        IF response_text IS NOT NULL AND response_text != '' THEN
            user_responses := user_responses || 'Day ' || day_num || ': ' || response_text || E'\n\n';
        END IF;
    END LOOP;
    
    -- Create summary prompt
    summary_prompt := 'Please create a thoughtful, encouraging summary of this user''s ' || 
                     challenge_record.title || ' journey. Here are their daily responses:' || E'\n\n' ||
                     user_responses || E'\n' ||
                     'Create a 2-3 paragraph summary that highlights their growth, insights, and key themes. ' ||
                     'Be encouraging and focus on their personal development journey.';
    
    -- Call the OpenAI edge function to generate summary
    -- Note: This will be handled by the frontend calling the edge function
    -- and then updating the record with the generated summary
    
    RAISE NOTICE 'AI summary generation triggered for challenge progress: %', progress_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a challenge and trigger AI summary
CREATE OR REPLACE FUNCTION complete_challenge(progress_id uuid)
RETURNS void AS $$
BEGIN
    -- Update the challenge status to completed
    UPDATE challenge_progress 
    SET 
        status = 'completed',
        completed_at = NOW()
    WHERE id = progress_id;
    
    -- Trigger AI summary generation
    PERFORM generate_challenge_summary(progress_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing completed challenges to have proper status
UPDATE challenge_progress 
SET status = 'completed' 
WHERE completed_at IS NOT NULL AND status != 'completed';

-- Add more default challenges with the new ones
INSERT INTO challenges (id, title, description, duration) VALUES
  ('gratitude-7', '7-Day Gratitude Journey', 'Transform your mindset with daily gratitude practice', 7),
  ('manifestation-21', '21-Day Manifestation Mastery', 'Build powerful manifestation habits over 21 days', 21),
  ('abundance-14', '14-Day Abundance Mindset', 'Shift into an abundance mindset in just 2 weeks', 14),
  ('mindfulness-10', '10-Day Mindfulness Reset', 'Cultivate present-moment awareness and inner peace', 10),
  ('confidence-14', '14-Day Confidence Builder', 'Build unshakeable self-confidence and self-worth', 14),
  ('creativity-7', '7-Day Creative Flow', 'Unlock your creative potential and artistic expression', 7)
ON CONFLICT (id) DO NOTHING;