/*
  # Create default notification schedules for existing users

  1. Purpose
     - Add default notification schedules for users who don't have any
     - Create morning motivation and evening reflection schedules

  2. Default Schedules
     - Good Morning Motivation: 8:00 AM, Monday-Friday
     - Evening Reflection: 8:00 PM, Every day
*/

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

-- Update the handle_new_user function to create default schedules
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, display_name, username, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    null,
    null,
    now(),
    now()
  );
  
  -- Create default notification schedules
  PERFORM create_default_schedules_for_user(new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;