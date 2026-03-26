
-- Journey stages table
CREATE TABLE public.journey_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  stage_code INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  completed_at TIMESTAMP WITH TIME ZONE,
  scheduled_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, stage_code)
);

ALTER TABLE public.journey_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read journey stages" ON public.journey_stages FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert journey stages" ON public.journey_stages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update journey stages" ON public.journey_stages FOR UPDATE TO public USING (true);

-- Quote requests table
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_role TEXT,
  requester_cpf TEXT,
  requester_email TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'requested',
  proposal_status TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quote requests" ON public.quote_requests FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert quote requests" ON public.quote_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update quote requests" ON public.quote_requests FOR UPDATE TO public USING (true);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  stage_code INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read appointments" ON public.appointments FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert appointments" ON public.appointments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update appointments" ON public.appointments FOR UPDATE TO public USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_journey_stages_updated_at BEFORE UPDATE ON public.journey_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
