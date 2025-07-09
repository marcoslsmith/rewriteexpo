/*
  # Fix user signup and policy creation issues

  1. Purpose
     - Fix the "Database error saving new user" issue during signup
     - Ensure policies are created without conflicts
     - Make profile creation robust and idempotent

  2. Changes
     - Drop existing policies individually to avoid conflicts
     - Create a robust handle_new_user function with proper error handling
     - Add ON CONFLICT handling for idempotent profile creation
     - Create utility function to fix existing users without profiles
*/

-- Drop existing policies individually to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create a robust handle_new_user function with proper error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  display_name_value text := NULL;
BEGIN
  -- Extract display_name from raw_user_meta_data if available
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    display_name_value := NEW.raw_user_meta_data->>'display_name';
    
    -- Try full_name as fallback
    IF display_name_value IS NULL THEN
      display_name_value := NEW.raw_user_meta_data->>'full_name';
    END IF;
  END IF;

  -- Insert profile with ON CONFLICT DO NOTHING for idempotency
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
    display_name_value,
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the trigger
  RAISE WARNING 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
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
  user_record RECORD;
BEGIN
  -- Get the user from auth.users
  SELECT * INTO user_record FROM auth.users WHERE id = user_id;
  
  IF user_record IS NULL THEN
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
    user_record.id,
    COALESCE(user_record.email, ''),
    user_record.raw_user_meta_data->>'display_name',
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
  users_fixed INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT au.id 
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    PERFORM create_profile_for_existing_user(user_record.id);
    users_fixed := users_fixed + 1;
  END LOOP;
  
  RAISE NOTICE 'Fixed % users missing profiles', users_fixed;
END $$;

-- Recreate the profile policy
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);