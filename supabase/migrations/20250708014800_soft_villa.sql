-- Ensure notification_schedules table exists with correct structure
-- (This table definition is typically handled in an earlier migration,
-- but included here for completeness if it somehow got missed or corrupted.
-- If it already exists, this statement will do nothing.)
CREATE TABLE IF NOT EXISTS notification_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text DEFAULT '',
  use_random_manifestation boolean DEFAULT true,
  "time" text NOT NULL, -- Quoted because 'time' is a reserved keyword
  days integer[] NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh (if they exist)
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
    
    RAISE NOTICE 'User % currently has % schedules', user_uuid, schedule_count;
    
    -- Only create if no schedules exist
    IF schedule_count = 0 THEN
        RAISE NOTICE 'Creating default schedules for user: %', user_uuid;
        
        -- Insert default morning schedule
        INSERT INTO notification_schedules (
            user_id,
            title,
            message,
            use_random_manifestation,
            "time", -- Quoted column name
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
            "time", -- Quoted column name
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
        
        RAISE NOTICE 'Successfully created default schedules for user: %', user_uuid;
    ELSE
        RAISE NOTICE 'User % already has % schedules, skipping creation', user_uuid, schedule_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to force create schedules even if they exist (for debugging/manual trigger)
CREATE OR REPLACE FUNCTION force_create_default_schedules_for_user(user_uuid uuid)
RETURNS void AS $$
BEGIN
    RAISE NOTICE 'Force creating default schedules for user: %', user_uuid;
    
    -- Insert default morning schedule
    INSERT INTO notification_schedules (
        user_id,
        title,
        message,
        use_random_manifestation,
        "time", -- Quoted column name
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
        "time", -- Quoted column name
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
    
    RAISE NOTICE 'Successfully force created default schedules for user: %', user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default schedules for ALL existing users who don't have any
-- This block will run as part of the migration
DO $$
DECLARE
    user_record RECORD;
    total_users INTEGER := 0;
    users_with_schedules INTEGER := 0;
    users_without_schedules INTEGER := 0;
    total_schedules_created INTEGER := 0;
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO total_users FROM profiles;
    RAISE NOTICE '=== MIGRATION START: Creating default schedules for existing users ===';
    RAISE NOTICE 'Total users in profiles table: %', total_users;
    
    -- Process each user
    FOR user_record IN SELECT id, email FROM profiles LOOP
        DECLARE
            schedule_count INTEGER;
            schedules_before INTEGER;
            schedules_after INTEGER;
        BEGIN
            -- Check if this user has any schedules
            SELECT COUNT(*) INTO schedule_count 
            FROM notification_schedules 
            WHERE user_id = user_record.id;
            
            schedules_before := schedule_count;
            
            IF schedule_count > 0 THEN
                users_with_schedules := users_with_schedules + 1;
                RAISE NOTICE 'User % (%) already has % schedules', user_record.email, user_record.id, schedule_count;
            ELSE
                users_without_schedules := users_without_schedules + 1;
                RAISE NOTICE 'Attempting to create default schedules for user: % (%)', user_record.email, user_record.id;
                PERFORM create_default_schedules_for_user(user_record.id);
                
                -- Check how many schedules were created
                SELECT COUNT(*) INTO schedules_after 
                FROM notification_schedules 
                WHERE user_id = user_record.id;
                
                total_schedules_created := total_schedules_created + (schedules_after - schedules_before);
                RAISE NOTICE 'User % now has % schedules (created %)', user_record.email, schedules_after, (schedules_after - schedules_before);
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE '=== MIGRATION COMPLETE: Default schedules for existing users ===';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Users with existing schedules: %', users_with_schedules;
    RAISE NOTICE 'Users without schedules (processed): %', users_without_schedules;
    RAISE NOTICE 'Total schedules created by this migration: %', total_schedules_created;
    RAISE NOTICE '==================================================================';
END $$;

-- Update the handle_new_user function to ensure it creates default schedules for new sign-ups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    RAISE NOTICE 'Creating new user profile for: % (%)', NEW.email, NEW.id;
    
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
    
    RAISE NOTICE 'Profile created for user: %', NEW.email;
    
    -- Create default notification schedules
    PERFORM create_default_schedules_for_user(NEW.id);
    
    RAISE NOTICE 'Default schedules creation attempted for new user: %', NEW.email;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set up for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Drop the existing debug_notification_schedules function that has conflicting return type
DROP FUNCTION IF EXISTS debug_notification_schedules();

-- Recreate the debug_notification_schedules function with the correct return type structure
CREATE OR REPLACE FUNCTION debug_notification_schedules()
RETURNS TABLE(
    user_email text,
    user_id uuid,
    schedule_count bigint,
    schedule_titles text[],
    schedule_details jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.email,
        p.id,
        COUNT(ns.id) as schedule_count,
        ARRAY_AGG(ns.title) FILTER (WHERE ns.title IS NOT NULL) as schedule_titles,
        jsonb_agg(
            jsonb_build_object(
                'id', ns.id,
                'title', ns.title,
                'message', ns.message,
                'time', ns."time", -- Quoted column name
                'days', ns.days,
                'is_active', ns.is_active,
                'created_at', ns.created_at
            )
        ) FILTER (WHERE ns.id IS NOT NULL) as schedule_details
    FROM profiles p
    LEFT JOIN notification_schedules ns ON p.id = ns.user_id
    GROUP BY p.id, p.email
    ORDER BY p.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure the check_user_schedules function is properly defined
DROP FUNCTION IF EXISTS check_user_schedules(text);

CREATE OR REPLACE FUNCTION check_user_schedules(user_email_param text)
RETURNS TABLE(
    schedule_id uuid,
    title text,
    message text,
    schedule_time text, -- Renamed to avoid conflict with 'time' keyword
    days integer[],
    is_active boolean,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ns.id,
        ns.title,
        ns.message,
        ns."time", -- Quoted column name
        ns.days,
        ns.is_active,
        ns.created_at
    FROM notification_schedules ns
    JOIN profiles p ON ns.user_id = p.id
    WHERE p.email = user_email_param
    ORDER BY ns.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a simple function to get current user's schedules (useful for debugging)
DROP FUNCTION IF EXISTS get_current_user_schedules();

CREATE OR REPLACE FUNCTION get_current_user_schedules()
RETURNS TABLE(
    schedule_id uuid,
    title text,
    message text,
    schedule_time text, -- Renamed to avoid conflict with 'time' keyword
    days integer[],
    is_active boolean,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ns.id,
        ns.title,
        ns.message,
        ns."time", -- Quoted column name
        ns.days,
        ns.is_active,
        ns.created_at
    FROM notification_schedules ns
    WHERE ns.user_id = auth.uid()
    ORDER BY ns.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count schedules by user (for quick debugging)
DROP FUNCTION IF EXISTS count_schedules_by_user();

CREATE OR REPLACE FUNCTION count_schedules_by_user()
RETURNS TABLE(
    user_email text,
    user_id uuid,
    schedule_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.email,
        p.id,
        COUNT(ns.id) as schedule_count
    FROM profiles p
    LEFT JOIN notification_schedules ns ON p.id = ns.user_id
    GROUP BY p.id, p.email
    ORDER BY schedule_count DESC, p.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;