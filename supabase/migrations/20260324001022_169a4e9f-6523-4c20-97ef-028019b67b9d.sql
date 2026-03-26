-- Indexes for high-volume queries on stage_audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_evaluation_created 
  ON public.stage_audit_logs (evaluation_id, created_at DESC);

-- Indexes for appointments high-volume scheduling
CREATE INDEX IF NOT EXISTS idx_appointments_eval_stage_status 
  ON public.appointments (evaluation_id, stage_code, status);

CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date 
  ON public.appointments (scheduled_date, status);

-- Indexes for evaluations filtering and pagination
CREATE INDEX IF NOT EXISTS idx_evaluations_pipeline_status 
  ON public.evaluations (pipeline_status);

CREATE INDEX IF NOT EXISTS idx_evaluations_company_created 
  ON public.evaluations (company_id, created_at DESC);

-- Indexes for journey_stages lookups
CREATE INDEX IF NOT EXISTS idx_journey_stages_eval_code 
  ON public.journey_stages (evaluation_id, stage_code);

-- Indexes for company search
CREATE INDEX IF NOT EXISTS idx_companies_cnpj 
  ON public.companies (cnpj);

-- Indexes for quote_requests
CREATE INDEX IF NOT EXISTS idx_quote_requests_eval 
  ON public.quote_requests (evaluation_id, created_at DESC);

-- Indexes for answers batch loading
CREATE INDEX IF NOT EXISTS idx_answers_evaluation 
  ON public.answers (evaluation_id);

-- Indexes for action_plans batch loading  
CREATE INDEX IF NOT EXISTS idx_action_plans_evaluation 
  ON public.action_plans (evaluation_id);