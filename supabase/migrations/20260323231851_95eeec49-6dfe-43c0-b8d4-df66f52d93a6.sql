
-- =====================================================
-- PHASE 8b: Profiles, permissions, RLS
-- =====================================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 2. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Permission functions
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.check_permission(_user_id uuid, _action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles app_role[];
BEGIN
  SELECT array_agg(role) INTO v_roles
  FROM public.user_roles
  WHERE user_id = _user_id;

  IF v_roles IS NULL THEN RETURN false; END IF;
  IF 'admin' = ANY(v_roles) THEN RETURN true; END IF;

  CASE _action
    WHEN 'create_case' THEN RETURN 'gestor' = ANY(v_roles) OR 'comercial' = ANY(v_roles);
    WHEN 'send_proposal' THEN RETURN 'gestor' = ANY(v_roles) OR 'comercial' = ANY(v_roles);
    WHEN 'accept_proposal' THEN RETURN 'gestor' = ANY(v_roles) OR 'comercial' = ANY(v_roles);
    WHEN 'schedule' THEN RETURN 'gestor' = ANY(v_roles) OR 'agendamento' = ANY(v_roles);
    WHEN 'reschedule' THEN RETURN 'gestor' = ANY(v_roles) OR 'agendamento' = ANY(v_roles);
    WHEN 'cancel' THEN RETURN 'gestor' = ANY(v_roles);
    WHEN 'realize' THEN RETURN 'gestor' = ANY(v_roles) OR 'executor' = ANY(v_roles);
    WHEN 'complete' THEN RETURN 'gestor' = ANY(v_roles) OR 'executor' = ANY(v_roles);
    WHEN 'finalize' THEN RETURN 'gestor' = ANY(v_roles);
    WHEN 'view_all' THEN RETURN 'gestor' = ANY(v_roles) OR 'comercial' = ANY(v_roles) OR 'agendamento' = ANY(v_roles) OR 'executor' = ANY(v_roles) OR 'leitura' = ANY(v_roles);
    WHEN 'export' THEN RETURN 'gestor' = ANY(v_roles) OR 'leitura' = ANY(v_roles);
    WHEN 'delete' THEN RETURN false;
    WHEN 'manage_users' THEN RETURN false;
    ELSE RETURN false;
  END CASE;
END;
$$;

-- 4. user_roles management policies
CREATE POLICY "Admins can insert user roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. Tighten evaluations RLS
DROP POLICY IF EXISTS "Anyone can read evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Anyone can insert evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Anyone can update evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Anyone can delete evaluations" ON public.evaluations;

CREATE POLICY "Auth read evaluations" ON public.evaluations
  FOR SELECT TO authenticated
  USING (public.check_permission(auth.uid(), 'view_all'));
CREATE POLICY "Anon read evaluations" ON public.evaluations
  FOR SELECT TO anon USING (true);
CREATE POLICY "Insert evaluations" ON public.evaluations
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update evaluations" ON public.evaluations
  FOR UPDATE TO authenticated
  USING (public.check_permission(auth.uid(), 'view_all'));
-- Allow anon updates for the client evaluation flow
CREATE POLICY "Anon update evaluations" ON public.evaluations
  FOR UPDATE TO anon USING (true);
CREATE POLICY "Admin delete evaluations" ON public.evaluations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Tighten journey_stages RLS
DROP POLICY IF EXISTS "Anyone can read journey stages" ON public.journey_stages;
DROP POLICY IF EXISTS "Anyone can insert journey stages" ON public.journey_stages;
DROP POLICY IF EXISTS "Anyone can update journey stages" ON public.journey_stages;
DROP POLICY IF EXISTS "Anyone can delete journey stages" ON public.journey_stages;

CREATE POLICY "Auth read journey stages" ON public.journey_stages
  FOR SELECT TO authenticated USING (public.check_permission(auth.uid(), 'view_all'));
CREATE POLICY "Anon read journey stages" ON public.journey_stages
  FOR SELECT TO anon USING (true);
CREATE POLICY "Insert journey stages" ON public.journey_stages
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update journey stages" ON public.journey_stages
  FOR UPDATE TO authenticated USING (public.check_permission(auth.uid(), 'view_all'));
CREATE POLICY "Anon update journey stages" ON public.journey_stages
  FOR UPDATE TO anon USING (true);
CREATE POLICY "Admin delete journey stages" ON public.journey_stages
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Tighten audit logs
DROP POLICY IF EXISTS "Anyone can read audit logs" ON public.stage_audit_logs;
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.stage_audit_logs;
CREATE POLICY "Auth read audit logs" ON public.stage_audit_logs
  FOR SELECT TO authenticated USING (public.check_permission(auth.uid(), 'view_all'));
CREATE POLICY "Insert audit logs" ON public.stage_audit_logs
  FOR INSERT WITH CHECK (true);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 9. Updated_at trigger
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
