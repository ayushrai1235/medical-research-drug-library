-- Supabase Migration: 20261030000000_init_schema.sql
-- Medical Research Drug Library initial schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Drugs table
CREATE TABLE IF NOT EXISTS public.drugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NULL,
  pdf_storage_path text NULL,
  pdf_status text NOT NULL DEFAULT 'missing' CHECK (pdf_status IN ('missing','mapped','uploaded','failed','ambiguous')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NULL,
  role text NOT NULL DEFAULT 'researcher' CHECK (role IN ('researcher','admin')),
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','hi','gu')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Research Sessions table (supports anonymous or cookie-based researcher sessions)
CREATE TABLE IF NOT EXISTS public.research_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','hi','gu')),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- 5. Activity Events table
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name_snapshot text NOT NULL,
  session_id text NULL,
  action text NOT NULL CHECK (action IN (
    'session_started',
    'drug_opened',
    'pdf_viewed',
    'drug_selected',
    'comparison_opened',
    'pdf_downloaded',
    'zip_downloaded',
    'comparison_pdf_downloaded'
  )),
  drug_id uuid NULL REFERENCES public.drugs(id) ON DELETE SET NULL,
  related_drug_ids uuid[] NOT NULL DEFAULT '{}',
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Admin Audit Logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drugs_category_id ON public.drugs(category_id);
CREATE INDEX IF NOT EXISTS idx_drugs_slug ON public.drugs(slug);
CREATE INDEX IF NOT EXISTS idx_drugs_is_active ON public.drugs(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON public.activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_action ON public.activity_events(action);
CREATE INDEX IF NOT EXISTS idx_activity_events_drug_id ON public.activity_events(drug_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_id ON public.activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_session_id ON public.activity_events(session_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_expires_at ON public.research_sessions(expires_at);

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Function to handle new auth users (e.g. admin accounts)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, role, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email, 'User'), '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'researcher'),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_drugs_updated_at ON public.drugs;
CREATE TRIGGER trg_drugs_updated_at
  BEFORE UPDATE ON public.drugs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Categories are readable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Categories are insertable by admins only"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Categories are updatable by admins only"
  ON public.categories FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Categories are deletable by admins only"
  ON public.categories FOR DELETE
  USING (public.is_admin());

-- Drugs policies
CREATE POLICY "Active drugs are readable by everyone"
  ON public.drugs FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Drugs are insertable by admins only"
  ON public.drugs FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Drugs are updatable by admins only"
  ON public.drugs FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Drugs are deletable by admins only"
  ON public.drugs FOR DELETE
  USING (public.is_admin());

-- Profiles policies
CREATE POLICY "Users can read own profile and admins can read all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own display_name and language"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Research sessions policies
CREATE POLICY "Research sessions can be inserted"
  ON public.research_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Research sessions can be viewed by session owner or admin"
  ON public.research_sessions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin() OR true);

CREATE POLICY "Research sessions can be updated by owner or admin"
  ON public.research_sessions FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

-- Activity events policies
CREATE POLICY "Admins can view all activity events"
  ON public.activity_events FOR SELECT
  USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Activity events can be inserted"
  ON public.activity_events FOR INSERT
  WITH CHECK (true);

-- Admin audit logs policies
CREATE POLICY "Admins can view admin audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- Storage bucket setup for research-pdfs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('research-pdfs', 'research-pdfs', false, 52428800, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO UPDATE SET public = false;

