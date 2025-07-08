/*
  # Fix handle_new_user function database error

  1. Purpose
     - Fix the "Database error saving new user" issue during signup
     - Ensure proper schema resolution for function calls

  2. Changes
     - Set explicit search_path in handle_new_user function
     - Fully qualify the create_default_schedules_for_user function call
     - Ensure reliable execution of the trigger function
*/

-- Update the handle_new_user function with proper schema resolution
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Set explicit search path to ensure proper function resolution
  SET search_path = public, pg_temp;
  
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
  
  -- Create default notification schedules with fully qualified function call
  PERFORM public.create_default_schedules_for_user(new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;