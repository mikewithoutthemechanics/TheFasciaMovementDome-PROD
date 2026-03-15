-- Migration: Auto user sync and welcome email trigger
-- Created: 2026-03-12 02:00:00
-- Description: Creates trigger functions to auto-create users in public.users table from Supabase Auth and queue welcome emails

-- Function to auto-create user in users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to send welcome email on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_welcome()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  user_email := NEW.email;
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1));
  
  -- Insert welcome email into queue (you may need to create this table or use existing email queue)
  -- For now, this is a placeholder - the actual email sending is handled by the app
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger runs after the user is created in our users table
CREATE TRIGGER on_users_welcome
  AFTER INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.waiver_accepted IS NOT TRUE)
  EXECUTE FUNCTION public.handle_new_user_welcome();
