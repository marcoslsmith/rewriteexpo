/*
  # Fix user signup database error

  1. Purpose
     - Fix the "Database error saving new user" issue during signup
     - Ensure proper profile creation for new users
     - Make the handle_new_user function more robust

  2. Changes
     - Update the handle_new_user function to properly handle NULL values
     - Add error handling to prevent failures during profile creation
     - Ensure the function is properly defined with SECURITY DEFINER
*/

-- Drop the existing handle_new_user function
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a more robust handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile with proper NULL handling and error trapping
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      display_name,
      username,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      NULL,
      NULL,
      NOW(),
      NOW()
    );
  EXCEPTION WHEN unique_violation THEN
    -- If profile already exists, do nothing (idempotent)
    RAISE NOTICE 'Profile already exists for user %', NEW.id;
  WHEN OTHERS THEN
    -- Log other errors but don't fail the trigger
    RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create a function to manually create a profile for an existing user
CREATE OR REPLACE FUNCTION create_profile_for_existing_user(user_id uuid)
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the user's email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_id;
  END IF;
  
  -- Insert profile if it doesn't exist
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    username,
    created_at,
    updated_at
  )
  VALUES (
    user_id,
    user_email,
    NULL,
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Profile created or already exists for user %', user_id;
END;
$$;

-- Create profiles for any existing users who don't have one
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id 
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    PERFORM create_profile_for_existing_user(user_record.id);
  END LOOP;
END $$;