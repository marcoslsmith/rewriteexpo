/*
  # Complete fix for notification schedules

  1. Ensure notification_schedules table exists with correct structure
  2. Fix all RLS policies to work properly
  3. Create default schedules for all existing users
  4. Fix the user creation trigger to always create defaults
  5. Add debugging function to check schedule creation
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

-- Enable RLS
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notification_schedules' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.notification_schedules';
    END LOOP;
END $$;

-- Create new policies with proper permissions
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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification schedules"
  ON notification_schedules
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create default schedules for a user
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
            is_active,
            created_at
        ) VALUES (
            user_uuid,
            'Good Morning Motivation',
            'Good morning! Start your day with intention. What will you manifest today?',
            false,
            '08:00',
            ARRAY[1, 2, 3, 4, 5], -- Monday to Friday
            true,
            NOW()
        );

        -- Insert default evening schedule
        INSERT INTO notification_schedules (
            user_id,
            title,
            message,
            use_random_manifestation,
            time,
            days,
            is_active,
            created_at
        ) VALUES (
            user_uuid,
            'Evening Reflection',
            'Time to wind down and reflect on your day. What went well?',
            false,
            '20:00',
            ARRAY[0, 1, 2, 3, 4, 5, 6], -- Every day
            true,
            NOW()
        );
        
        -- Log that we created schedules (for debugging)
        RAISE NOTICE 'Created default schedules for user: %', user_uuid;
    ELSE
        RAISE NOTICE 'User % already has % schedules', user_uuid, schedule_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default schedules for ALL existing users who don't have any
DO $$
DECLARE
    user_record RECORD;
    total_users INTEGER := 0;
    users_with_schedules INTEGER := 0;
    users_without_schedules INTEGER := 0;
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO total_users FROM profiles;
    RAISE NOTICE 'Total users in profiles table: %', total_users;
    
    -- Process each user
    FOR user_record IN SELECT id FROM profiles LOOP
        DECLARE
            schedule_count INTEGER;
        BEGIN
            -- Check if this user has any schedules
            SELECT COUNT(*) INTO schedule_count 
            FROM notification_schedules 
            WHERE user_id = user_record.id;
            
            IF schedule_count > 0 THEN
                users_with_schedules := users_with_schedules + 1;
                RAISE NOTICE 'User % already has % schedules', user_record.id, schedule_count;
            ELSE
                users_without_schedules := users_without_schedules + 1;
                RAISE NOTICE 'Creating default schedules for user: %', user_record.id;
                PERFORM create_default_schedules_for_user(user_record.id);
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE 'Migration complete: % total users, % with schedules, % without schedules', 
                 total_users, users_with_schedules, users_without_schedules;
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

-- Function to debug notification schedules (can be called from SQL editor)
CREATE OR REPLACE FUNCTION debug_notification_schedules()
RETURNS TABLE(
    user_email text,
    user_id uuid,
    schedule_count bigint,
    schedule_titles text[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.email,
        p.id,
        COUNT(ns.id) as schedule_count,
        ARRAY_AGG(ns.title) as schedule_titles
    FROM profiles p
    LEFT JOIN notification_schedules ns ON p.id = ns.user_id
    GROUP BY p.id, p.email
    ORDER BY p.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;