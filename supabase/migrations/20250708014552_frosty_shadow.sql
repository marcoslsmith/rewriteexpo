/*
  # Fix debug_notification_schedules function

  1. Purpose
     - Drop the existing debug_notification_schedules function that has conflicting return type
     - Recreate it with the correct return type structure
     - Ensure it matches what the app code expects

  2. Changes
     - DROP FUNCTION to remove existing conflicting function
     - CREATE new function with proper return structure
     - Add additional helper functions for debugging
*/

-- Drop the existing function that has conflicting return type
DROP FUNCTION IF EXISTS debug_notification_schedules();

-- Recreate the function with the correct return type structure
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
                'time', ns."time",
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
    schedule_time text,
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
        ns."time",
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
CREATE OR REPLACE FUNCTION get_current_user_schedules()
RETURNS TABLE(
    schedule_id uuid,
    title text,
    message text,
    schedule_time text,
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
        ns."time",
        ns.days,
        ns.is_active,
        ns.created_at
    FROM notification_schedules ns
    WHERE ns.user_id = auth.uid()
    ORDER BY ns.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count schedules by user (for quick debugging)
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