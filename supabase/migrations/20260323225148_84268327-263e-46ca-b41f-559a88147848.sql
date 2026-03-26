
-- =============================================
-- PHASE 5: DATA MODELING FOR NATIONAL SCALE
-- =============================================

-- 1. COMPANY UNITS (establishments/branches)
CREATE TABLE public.company_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  unit_code TEXT,
  cnpj TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  is_headquarters BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read company_units" ON public.company_units FOR SELECT USING (true);
CREATE POLICY "Anyone can insert company_units" ON public.company_units FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update company_units" ON public.company_units FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete company_units" ON public.company_units FOR DELETE USING (true);

-- 2. PROFESSIONALS (Med Work executors/consultants)
CREATE TABLE public.professionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  phone TEXT,
  specialty TEXT,
  registration_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read professionals" ON public.professionals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert professionals" ON public.professionals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update professionals" ON public.professionals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete professionals" ON public.professionals FOR DELETE USING (true);

-- 3. DOCUMENTS (attachments per evaluation)
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  uploaded_by TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes BIGINT,
  category TEXT NOT NULL DEFAULT 'geral',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete documents" ON public.documents FOR DELETE USING (true);

-- 4. ADD unit_id TO evaluations
ALTER TABLE public.evaluations ADD COLUMN unit_id UUID REFERENCES public.company_units(id) ON DELETE SET NULL;

-- 5. ADD fields TO appointments
ALTER TABLE public.appointments ADD COLUMN professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN appointment_type TEXT NOT NULL DEFAULT 'presencial';
ALTER TABLE public.appointments ADD COLUMN location TEXT;
ALTER TABLE public.appointments ADD COLUMN notes TEXT;

-- 6. ADD contact fields to companies
ALTER TABLE public.companies ADD COLUMN contact_name TEXT;
ALTER TABLE public.companies ADD COLUMN contact_email TEXT;
ALTER TABLE public.companies ADD COLUMN contact_phone TEXT;
ALTER TABLE public.companies ADD COLUMN employee_count INTEGER;
ALTER TABLE public.companies ADD COLUMN sector TEXT;

-- 7. PERFORMANCE INDEXES (all with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_evaluations_company_id ON public.evaluations(company_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator_id ON public.evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON public.evaluations(status);
CREATE INDEX IF NOT EXISTS idx_evaluations_unit_id ON public.evaluations(unit_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON public.evaluations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_access_cpf ON public.companies(access_cpf);
CREATE INDEX IF NOT EXISTS idx_answers_evaluation_id ON public.answers(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_evaluation_id ON public.action_plans(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_journey_stages_evaluation_id ON public.journey_stages(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_journey_stages_status ON public.journey_stages(status);
CREATE INDEX IF NOT EXISTS idx_appointments_evaluation_id ON public.appointments(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON public.appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_quote_requests_evaluation_id ON public.quote_requests(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_company_id ON public.quote_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_stage_audit_logs_evaluation_id ON public.stage_audit_logs(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_stage_audit_logs_created_at ON public.stage_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_units_company_id ON public.company_units(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_evaluation_id ON public.documents(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_evaluation_id ON public.email_logs(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluators_cpf ON public.evaluators(cpf);

-- 8. UPDATE TRIGGERS
CREATE TRIGGER update_company_units_updated_at
  BEFORE UPDATE ON public.company_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
