-- MEMCALL UPDATE SCRIPT
-- Paste this into the Supabase SQL Editor and click "RUN"

-- 1. Add Columns to existing tables
ALTER TABLE public.patient_profiles 
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create Family Photo Quiz Tables
CREATE TABLE IF NOT EXISTS public.family_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
-- Reminders
CREATE POLICY "Patients can manage own reminders" ON public.reminders FOR ALL USING (auth.uid() = patient_id);

-- Storage bucket for family photos
INSERT INTO storage.buckets (id, name, public) VALUES ('family_photos', 'family_photos', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users can upload family photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'family_photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view family photos" ON storage.objects FOR SELECT USING (bucket_id = 'family_photos');
CREATE POLICY "Users can delete family photos" ON storage.objects FOR DELETE USING (bucket_id = 'family_photos' AND auth.uid()::text = (storage.foldername(name))[1]);
