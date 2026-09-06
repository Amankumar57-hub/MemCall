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
  avatar_url TEXT,
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
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_updated_at TIMESTAMP WITH TIME ZONE,
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
CREATE POLICY "Caregivers can delete links" ON public.caregiver_patient_links FOR DELETE USING (
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
CREATE POLICY "Patients can manage own reminders" ON public.reminders FOR ALL USING (auth.uid() = patient_id);
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

-- Alerts: Caregiver can read/update own, Patient can insert, read, and update own
CREATE POLICY "Caregivers can manage own alerts" ON public.alerts FOR ALL USING (auth.uid() = caregiver_id);
CREATE POLICY "Patients can insert alerts for caregivers" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patients can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = patient_id);

-- 5. Set up Realtime Replication
-- Drop publication if exists then create it
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

-- Add tables to the publication to enable realtime listening
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_profiles;

-- 6. Trigger to automatically create `users` row on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  INSERT INTO public.users (auth_id, full_name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'), 
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'patient')
  )
  ON CONFLICT (email) DO UPDATE SET auth_id = EXCLUDED.auth_id
  RETURNING id INTO v_user_id;
  
  IF (COALESCE(new.raw_user_meta_data->>'role', 'patient') = 'patient') THEN
    INSERT INTO public.patient_profiles (user_id) VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- END OF SCHEMA

-- MEMCALL UPDATE SCRIPT
-- Paste this into the Supabase SQL Editor and click "RUN"

-- 1. Add Theme to patient_profiles
ALTER TABLE public.patient_profiles 
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';

-- 2. Create Family Photo Quiz Tables
CREATE TABLE IF NOT EXISTS public.family_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Patient Journals (Memory Diary)
CREATE TABLE IF NOT EXISTS public.patient_journals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  audio_url TEXT,
  transcription TEXT NOT NULL,
  ai_mood TEXT DEFAULT 'neutral', -- 'happy', 'sad', 'anxious', 'confused', 'neutral'
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.patient_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can insert their own journals" ON public.patient_journals FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients can read their own journals" ON public.patient_journals FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Caregivers can read linked patient journals" ON public.patient_journals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_patient_links 
    WHERE caregiver_patient_links.patient_id = patient_journals.patient_id 
    AND caregiver_patient_links.caregiver_id = auth.uid()
  )
);


-- 4. Create Task Guides (Visual Step-by-Step tasks)
CREATE TABLE IF NOT EXISTS public.task_guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'list', -- Lucide icon name for display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.task_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID REFERENCES public.task_guides(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Patient Items (Object Locator)
CREATE TABLE IF NOT EXISTS public.patient_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  location_desc TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.patient_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can read own items" ON public.patient_items FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Caregivers can read linked patient items" ON public.patient_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.caregiver_patient_links WHERE caregiver_patient_links.patient_id = patient_items.patient_id AND caregiver_patient_links.caregiver_id = auth.uid()));
CREATE POLICY "Caregivers can manage patient items" ON public.patient_items FOR ALL USING (EXISTS (SELECT 1 FROM public.caregiver_patient_links WHERE caregiver_patient_links.patient_id = patient_items.patient_id AND caregiver_patient_links.caregiver_id = auth.uid()));

-- 6. Game Sessions (Adaptive Difficulty Tracking)
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  score_percentage INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can insert game sessions" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients can read own game sessions" ON public.game_sessions FOR SELECT USING (auth.uid() = patient_id);

ALTER TABLE public.task_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can read their task guides" ON public.task_guides FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Caregivers can read linked task guides" ON public.task_guides FOR SELECT USING (EXISTS (SELECT 1 FROM public.caregiver_patient_links WHERE caregiver_patient_links.patient_id = task_guides.patient_id AND caregiver_patient_links.caregiver_id = auth.uid()));
CREATE POLICY "Caregivers can manage task guides" ON public.task_guides FOR ALL USING (EXISTS (SELECT 1 FROM public.caregiver_patient_links WHERE caregiver_patient_links.patient_id = task_guides.patient_id AND caregiver_patient_links.caregiver_id = auth.uid()));

CREATE POLICY "Patients can read their task steps" ON public.task_steps FOR SELECT USING (EXISTS (SELECT 1 FROM public.task_guides WHERE task_guides.id = task_steps.guide_id AND task_guides.patient_id = auth.uid()));
CREATE POLICY "Caregivers can manage task steps" ON public.task_steps FOR ALL USING (EXISTS (SELECT 1 FROM public.task_guides JOIN public.caregiver_patient_links ON task_guides.patient_id = caregiver_patient_links.patient_id WHERE task_guides.id = task_steps.guide_id AND caregiver_patient_links.caregiver_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES public.family_sections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relation TEXT,
  avatar_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Game Progress Table
CREATE TABLE IF NOT EXISTS public.game_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  highest_level INTEGER DEFAULT 1,
  total_games_played INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, game_id)
);

-- 4. Create Mood History Table
CREATE TABLE IF NOT EXISTS public.mood_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable RLS
ALTER TABLE public.family_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_history ENABLE ROW LEVEL SECURITY;

-- 6. Add RLS Policies
-- Family Sections
CREATE POLICY "Users can manage own family sections" ON public.family_sections FOR ALL USING (auth.uid() = user_id);
-- Family Members
CREATE POLICY "Users can manage own family members" ON public.family_members FOR ALL USING (auth.uid() = user_id);
-- Game Progress
CREATE POLICY "Users can manage own game progress" ON public.game_progress FOR ALL USING (auth.uid() = user_id);
-- Mood History
CREATE POLICY "Users can manage own mood history" ON public.mood_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Caregivers can read linked patient mood history" ON public.mood_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_patient_links
    WHERE caregiver_patient_links.patient_id = mood_history.user_id
    AND caregiver_patient_links.caregiver_id = auth.uid()
    AND caregiver_patient_links.status = 'active'
  )
);

-- Storage bucket for family photos
INSERT INTO storage.buckets (id, name, public) VALUES ('family_photos', 'family_photos', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users can upload family photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'family_photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view family photos" ON storage.objects FOR SELECT USING (bucket_id = 'family_photos');
CREATE POLICY "Users can delete family photos" ON storage.objects FOR DELETE USING (bucket_id = 'family_photos' AND auth.uid()::text = (storage.foldername(name))[1]);
