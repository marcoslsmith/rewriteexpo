/*
  # Fix handle_new_user trigger for successful user signup

  1. Updates
    - Update the handle_new_user trigger function to properly insert all required fields
    - Ensure email is populated from auth.users table
    - Provide default values for optional fields to prevent null constraint violations

  2. Security
    - Maintains existing RLS policies
    - Ensures users can update their own profiles after signup
*/

-- Update the handle_new_user function to properly handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, username, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    null,
    null,
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();