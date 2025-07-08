/*
  # Fix default notification schedules

  1. Purpose
     - Ensure all existing users have default notification schedules
     - Create default schedules for users who don't have any
     - Fix any issues with the default schedule creation

  2. Default Schedules
     - Good Morning Motivation: 8:00 AM, Monday-Friday
     - Evening Reflection: 8:00 PM, Every day
*/

-- Function to create default schedules for a user (improved version)
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

-- Create default schedules for all existing users who don't have any
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT p.id 
        FROM profiles p 
        WHERE NOT EXISTS (
            SELECT 1 FROM notification_schedules ns 
            WHERE ns.user_id = p.id
        )
    LOOP
        PERFORM create_default_schedules_for_user(user_record.id);
    END LOOP;
END $$;

-- Update the handle_new_user function to ensure it works properly
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