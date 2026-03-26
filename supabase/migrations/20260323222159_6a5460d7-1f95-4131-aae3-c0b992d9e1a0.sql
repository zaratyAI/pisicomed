
-- 1. Add pipeline_status to evaluations for high-level funnel tracking
ALTER TABLE public.evaluations 
ADD COLUMN IF NOT EXISTS pipeline_status text NOT NULL DEFAULT 'avaliacao_inicial';

-- 2. Create stage audit log table for full traceability
CREATE TABLE public.stage_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
    stage_code integer,
    from_status text,
    to_status text NOT NULL,
    action text NOT NULL,
    changed_by text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS on audit logs
ALTER TABLE public.stage_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for audit logs (public read/insert, no update/delete)
CREATE POLICY "Anyone can read audit logs" ON public.stage_audit_logs FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert audit logs" ON public.stage_audit_logs FOR INSERT TO public WITH CHECK (true);

-- 5. Add index for efficient querying by evaluation
CREATE INDEX idx_stage_audit_logs_evaluation ON public.stage_audit_logs(evaluation_id);
CREATE INDEX idx_stage_audit_logs_created ON public.stage_audit_logs(created_at);

-- 6. Add index on evaluations.pipeline_status for filtering
CREATE INDEX idx_evaluations_pipeline_status ON public.evaluations(pipeline_status);
