-- MEMCALL DATABASE SCHEMA & RLS POLICIES
-- Paste this entire file into the Supabase SQL Editor and click "RUN"

-- 1. Create custom types
CREATE TYPE user_role AS ENUM ('patient', 'caregiver', 'admin');
CREATE TYPE link_status AS ENUM ('pending', 'active', 'rejected');

-- 2. Create tables

-- Users Table (Extends Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role user_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Patient Profiles (Specific info for patients)
CREATE TABLE public.patient_profiles (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  language_preference TEXT DEFAULT 'en',
  current_cognitive_score INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Caregiver-Patient Links
CREATE TABLE public.caregiver_patient_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status link_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(caregiver_id, patient_id)
);

-- Game Sessions
CREATE TABLE public.game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL, -- e.g., 'memory-match'
  score INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cognitive Scores (Aggregated weekly by Edge Functions)
CREATE TABLE public.cognitive_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  score_value INTEGER NOT NULL,
  trend TEXT DEFAULT 'stable', -- 'improving', 'stable', 'declining'
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Reminders
CREATE TABLE public.reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Caregiver who made it
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'medicine', 'hydration', 'activity'
  time TIME NOT NULL,
  frequency TEXT DEFAULT 'daily',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Reminder Logs
CREATE TABLE public.reminder_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT DEFAULT 'completed'
);

-- Alerts
CREATE TABLE public.alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'reminder', 'cognitive_drop', 'missed_meds'
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_patient_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Policies

-- Users: Can read their own data, and caregivers can read their linked patients
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Caregivers can read linked patients" ON public.users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_patient_links 
    WHERE caregiver_patient_links.patient_id = users.id 
    AND caregiver_patient_links.caregiver_id = auth.uid()
  )
);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Patient Profiles: Patient can read/update own, caregiver can read linked
CREATE POLICY "Patients can read own profile data" ON public.patient_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Caregivers can read linked patient profiles" ON public.patient_profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_patient_links 
    WHERE caregiver_patient_links.patient_id = patient_profiles.user_id 
    AND caregiver_patient_links.caregiver_id = auth.uid()
  )
);
CREATE POLICY "Patients can update own profile data" ON public.patient_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Caregiver Patient Links: Caregiver and Patient can see their own links
CREATE POLICY "Users can see their links" ON public.caregiver_patient_links FOR SELECT USING (
  auth.uid() = caregiver_id OR auth.uid() = patient_id
);
CREATE POLICY "Caregivers can create links" ON public.caregiver_patient_links FOR INSERT WITH CHECK (
  auth.uid() = caregiver_id
);

-- Game Sessions: Patient can read/insert own, caregiver can read linked
CREATE POLICY "Patients can manage own game sessions" ON public.game_sessions FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Caregivers can view linked patient sessions" ON public.game_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_patient_links 
    WHERE caregiver_patient_links.patient_id = game_sessions.patient_id 
    AND caregiver_patient_links.caregiver_id = auth.uid()
  )
);

-- Cognitive Scores: Patient can read own, caregiver can read linked
CREATE POLICY "Patients can view own scores" ON public.cognitive_scores FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Caregivers can view linked patient scores" ON public.cognitive_scores FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_patient_links 
    WHERE caregiver_patient_links.patient_id = cognitive_scores.patient_id 
    AND caregiver_patient_links.caregiver_id = auth.uid()
  )
);

-- Reminders: Patient can read own, caregiver can manage linked
CREATE POLICY "Patients can view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Caregivers can manage linked patient reminders" ON public.reminders FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_patient_links 
    WHERE caregiver_patient_links.patient_id = reminders.patient_id 
    AND caregiver_patient_links.caregiver_id = auth.uid()
  )
);

-- Reminder Logs: Patient can insert/read own, caregiver can read linked
CREATE POLICY "Patients can manage own reminder logs" ON public.reminder_logs FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Caregivers can view linked patient reminder logs" ON public.reminder_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_patient_links 
    WHERE caregiver_patient_links.patient_id = reminder_logs.patient_id 
    AND caregiver_patient_links.caregiver_id = auth.uid()
  )
);

-- Alerts: Caregiver can read/update own
CREATE POLICY "Caregivers can manage own alerts" ON public.alerts FOR ALL USING (auth.uid() = caregiver_id);

-- 5. Set up Realtime Replication
-- Drop publication if exists then create it
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

-- Add tables to the publication to enable realtime listening
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;

-- 6. Trigger to automatically create `users` row on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', COALESCE((new.raw_user_meta_data->>'role')::user_role, 'patient'));
  
  IF (new.raw_user_meta_data->>'role' = 'patient' OR new.raw_user_meta_data->>'role' IS NULL) THEN
    INSERT INTO public.patient_profiles (user_id) VALUES (new.id);
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- END OF SCHEMA
