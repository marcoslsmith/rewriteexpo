/*
  # Fix notification schedules and ensure default schedules work

  1. Purpose
     - Ensure notification_schedules table exists with proper structure
     - Create default schedules for all users (existing and new)
     - Fix the user creation trigger to properly create default schedules

  2. Default Schedules
     - Good Morning Motivation: 8:00 AM, Monday-Friday
     - Evening Reflection: 8:00 PM, Every day
*/

-- Ensure notification_schedules table exists with correct structure
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

-- Enable RLS if not already enabled
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;

-- Drop and recreate notification schedule policies to ensure they work
DROP POLICY IF EXISTS "Users can read own notification schedules" ON notification_schedules;
DROP POLICY IF EXISTS "Users can insert own notification schedules" ON notification_schedules;
DROP POLICY IF EXISTS "Users can update own notification schedules" ON notification_schedules;
DROP POLICY IF EXISTS "Users can delete own notification schedules" ON notification_schedules;

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

-- Function to create default schedules for a user
CREATE OR REPLACE FUNCTION create_default_schedules_for_user(user_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Check if user already has schedules
  IF NOT EXISTS (
    SELECT 1 FROM notification_schedules 
    WHERE user_id = user_uuid
  ) THEN
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

-- Create default schedules for ALL existing users who don't have any
DO $$
DECLARE
    user_record RECORD;
    schedule_count INTEGER;
BEGIN
    FOR user_record IN 
        SELECT id FROM profiles
    LOOP
        -- Check if this user has any schedules
        SELECT COUNT(*) INTO schedule_count 
        FROM notification_schedules 
        WHERE user_id = user_record.id;
        
        -- If no schedules exist, create defaults
        IF schedule_count = 0 THEN
            PERFORM create_default_schedules_for_user(user_record.id);
        END IF;
    END LOOP;
END $$;

-- Update the handle_new_user function to ensure it creates default schedules
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile first
  INSERT INTO public.profiles (id, email, display_name, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
    NULL,
    NOW(),
    NOW()
  );
  
  -- Create default notification schedules
  PERFORM create_default_schedules_for_user(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();