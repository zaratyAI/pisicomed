
-- =====================================================
-- BACKEND HARDENING: Server-side validation & concurrency
-- =====================================================

-- 1. Add version column for optimistic locking on evaluations
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 2. Add version column for optimistic locking on journey_stages
ALTER TABLE public.journey_stages ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 3. Create function to validate and execute stage transitions atomically
CREATE OR REPLACE FUNCTION public.transition_stage_safe(
  p_evaluation_id uuid,
  p_stage_code integer,
  p_new_status text,
  p_changed_by text DEFAULT 'admin',
  p_notes text DEFAULT NULL,
  p_origin text DEFAULT 'manual',
  p_extra_fields jsonb DEFAULT '{}'::jsonb,
  p_expected_version integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
  v_current_version integer;
  v_allowed text[];
  v_transition_map jsonb := '{
    "pendente": ["disponivel", "cancelado"],
    "disponivel": ["em_andamento", "aguardando_proposta", "agendado", "cancelado"],
    "em_andamento": ["aguardando_proposta", "agendado", "concluida", "cancelado"],
    "aguardando_proposta": ["proposta_enviada", "cancelado"],
    "proposta_enviada": ["proposta_aceita", "aguardando_proposta", "cancelado", "nao_convertido"],
    "proposta_aceita": ["concluida", "cancelado"],
    "agendado": ["realizado", "agendado", "cancelado"],
    "realizado": ["concluida"],
    "concluida": [],
    "cancelado": []
  }'::jsonb;
  v_allowed_arr jsonb;
  v_next_status text;
BEGIN
  -- Lock the row for update
  SELECT status, version INTO v_current_status, v_current_version
  FROM journey_stages
  WHERE evaluation_id = p_evaluation_id AND stage_code = p_stage_code
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', format('Etapa %s não encontrada', p_stage_code));
  END IF;

  -- Optimistic locking check
  IF p_expected_version IS NOT NULL AND v_current_version != p_expected_version THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conflito de concorrência: esta etapa foi modificada por outro usuário. Recarregue e tente novamente.');
  END IF;

  -- Check allowed transitions
  v_allowed_arr := v_transition_map -> v_current_status;
  IF v_allowed_arr IS NULL OR NOT v_allowed_arr ? p_new_status THEN
    RETURN jsonb_build_object('success', false, 'error', format('Transição inválida: etapa %s de %s → %s', p_stage_code, v_current_status, p_new_status));
  END IF;

  -- Update the stage
  UPDATE journey_stages
  SET status = p_new_status,
      version = version + 1,
      completed_at = CASE WHEN p_new_status IN ('concluida', 'realizado') THEN now() ELSE completed_at END,
      scheduled_date = CASE WHEN p_extra_fields ? 'scheduled_date' THEN (p_extra_fields->>'scheduled_date')::date ELSE scheduled_date END,
      updated_at = now()
  WHERE evaluation_id = p_evaluation_id AND stage_code = p_stage_code;

  -- Audit log
  INSERT INTO stage_audit_logs (evaluation_id, stage_code, from_status, to_status, action, changed_by, notes, origin)
  VALUES (p_evaluation_id, p_stage_code, v_current_status, p_new_status,
          format('stage%s:%s→%s', p_stage_code, v_current_status, p_new_status),
          p_changed_by, p_notes, p_origin);

  -- Auto-unlock next stage on completion
  IF p_new_status = 'concluida' AND p_stage_code < 8 THEN
    UPDATE journey_stages
    SET status = 'disponivel', version = version + 1, updated_at = now()
    WHERE evaluation_id = p_evaluation_id AND stage_code = p_stage_code + 1 AND status = 'pendente';

    IF FOUND THEN
      INSERT INTO stage_audit_logs (evaluation_id, stage_code, from_status, to_status, action, changed_by, notes, origin)
      VALUES (p_evaluation_id, p_stage_code + 1, 'pendente', 'disponivel',
              format('auto-unlock:stage%s', p_stage_code + 1), 'sistema',
              format('Desbloqueado automaticamente após conclusão da etapa %s', p_stage_code), 'automatico');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'from_status', v_current_status, 'to_status', p_new_status, 'version', v_current_version + 1);
END;
$$;

-- 4. Create function to validate and execute pipeline transitions atomically
CREATE OR REPLACE FUNCTION public.transition_pipeline_safe(
  p_evaluation_id uuid,
  p_new_status text,
  p_changed_by text DEFAULT 'admin',
  p_notes text DEFAULT NULL,
  p_origin text DEFAULT 'manual',
  p_expected_version integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
  v_current_version integer;
  v_transition_map jsonb := '{
    "avaliacao_inicial": ["proposta_solicitada", "cancelado", "nao_convertido"],
    "proposta_solicitada": ["proposta_enviada", "cancelado", "nao_convertido"],
    "proposta_enviada": ["proposta_aceita", "proposta_solicitada", "cancelado", "nao_convertido"],
    "proposta_aceita": ["agendamento_pendente", "cancelado"],
    "agendamento_pendente": ["agendado", "cancelado"],
    "agendado": ["em_realizacao", "agendamento_pendente", "cancelado"],
    "em_realizacao": ["em_analise", "cancelado"],
    "em_analise": ["finalizado", "cancelado"],
    "finalizado": [],
    "cancelado": [],
    "nao_convertido": []
  }'::jsonb;
  v_allowed_arr jsonb;
BEGIN
  -- Lock evaluation row
  SELECT pipeline_status, version INTO v_current_status, v_current_version
  FROM evaluations
  WHERE id = p_evaluation_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Avaliação não encontrada');
  END IF;

  -- Optimistic locking
  IF p_expected_version IS NOT NULL AND v_current_version != p_expected_version THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conflito de concorrência: avaliação modificada por outro usuário. Recarregue.');
  END IF;

  -- Check allowed transitions
  v_allowed_arr := v_transition_map -> v_current_status;
  IF v_allowed_arr IS NULL OR NOT v_allowed_arr ? p_new_status THEN
    RETURN jsonb_build_object('success', false, 'error', format('Transição de pipeline inválida: %s → %s', v_current_status, p_new_status));
  END IF;

  -- Update
  UPDATE evaluations
  SET pipeline_status = p_new_status,
      version = version + 1,
      updated_at = now()
  WHERE id = p_evaluation_id;

  -- Audit
  INSERT INTO stage_audit_logs (evaluation_id, from_status, to_status, action, changed_by, notes, origin)
  VALUES (p_evaluation_id, v_current_status, p_new_status,
          format('pipeline:%s→%s', v_current_status, p_new_status),
          p_changed_by, p_notes, p_origin);

  RETURN jsonb_build_object('success', true, 'from_status', v_current_status, 'to_status', p_new_status, 'version', v_current_version + 1);
END;
$$;

-- 5. Create idempotent appointment creation function
CREATE OR REPLACE FUNCTION public.create_appointment_safe(
  p_evaluation_id uuid,
  p_stage_code integer,
  p_scheduled_date date,
  p_changed_by text DEFAULT 'admin',
  p_notes text DEFAULT NULL,
  p_appointment_type text DEFAULT 'presencial',
  p_location text DEFAULT NULL,
  p_professional_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_appointment_id uuid;
  v_stage_result jsonb;
BEGIN
  -- Check for existing active appointment (idempotency)
  SELECT id INTO v_existing_id
  FROM appointments
  WHERE evaluation_id = p_evaluation_id
    AND stage_code = p_stage_code
    AND status = 'agendado'
    AND scheduled_date = p_scheduled_date;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'appointment_id', v_existing_id, 'idempotent', true);
  END IF;

  -- Cancel any existing active appointments for this stage
  UPDATE appointments
  SET status = 'cancelado', updated_at = now()
  WHERE evaluation_id = p_evaluation_id
    AND stage_code = p_stage_code
    AND status = 'agendado';

  -- Create new appointment
  INSERT INTO appointments (evaluation_id, stage_code, scheduled_date, appointment_type, location, professional_id, notes, status)
  VALUES (p_evaluation_id, p_stage_code, p_scheduled_date, p_appointment_type, p_location, p_professional_id, p_notes, 'agendado')
  RETURNING id INTO v_appointment_id;

  -- Transition stage
  v_stage_result := transition_stage_safe(p_evaluation_id, p_stage_code, 'agendado', p_changed_by, 
    COALESCE(p_notes, format('Agendado para %s', p_scheduled_date)), 'manual',
    jsonb_build_object('scheduled_date', p_scheduled_date::text));

  IF NOT (v_stage_result->>'success')::boolean THEN
    RAISE EXCEPTION '%', v_stage_result->>'error';
  END IF;

  RETURN jsonb_build_object('success', true, 'appointment_id', v_appointment_id, 'idempotent', false);
END;
$$;

-- 6. Paginated evaluations query function
CREATE OR REPLACE FUNCTION public.get_evaluations_paginated(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_pipeline_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_order_by text DEFAULT 'created_at',
  p_order_dir text DEFAULT 'desc'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_data jsonb;
BEGIN
  -- Count total matching
  SELECT count(*) INTO v_total
  FROM evaluations e
  JOIN companies c ON c.id = e.company_id
  WHERE (p_pipeline_status IS NULL OR e.pipeline_status = p_pipeline_status)
    AND (p_search IS NULL OR c.legal_name ILIKE '%' || p_search || '%' OR c.cnpj LIKE '%' || p_search || '%');

  -- Fetch page
  SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO v_data
  FROM (
    SELECT e.id, e.pipeline_status, e.status, e.created_at, e.started_at, e.finished_at,
           e.total_questions, e.total_actions, e.version,
           jsonb_build_object('id', c.id, 'cnpj', c.cnpj, 'legal_name', c.legal_name, 'trade_name', c.trade_name, 'city', c.city, 'state', c.state) as company,
           jsonb_build_object('id', ev.id, 'name', ev.name, 'email', ev.email, 'cpf', ev.cpf) as evaluator
    FROM evaluations e
    JOIN companies c ON c.id = e.company_id
    JOIN evaluators ev ON ev.id = e.evaluator_id
    WHERE (p_pipeline_status IS NULL OR e.pipeline_status = p_pipeline_status)
      AND (p_search IS NULL OR c.legal_name ILIKE '%' || p_search || '%' OR c.cnpj LIKE '%' || p_search || '%')
    ORDER BY
      CASE WHEN p_order_dir = 'asc' THEN e.created_at END ASC,
      CASE WHEN p_order_dir = 'desc' OR p_order_dir IS NULL THEN e.created_at END DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('data', v_data, 'total', v_total, 'limit', p_limit, 'offset', p_offset);
END;
$$;

-- 7. Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_evaluations_version ON public.evaluations(version);
CREATE INDEX IF NOT EXISTS idx_journey_stages_version ON public.journey_stages(version);
CREATE INDEX IF NOT EXISTS idx_appointments_eval_stage_status ON public.appointments(evaluation_id, stage_code, status);
CREATE INDEX IF NOT EXISTS idx_stage_audit_created ON public.stage_audit_logs(created_at DESC);
