CREATE OR REPLACE FUNCTION public.transition_stage_safe(p_evaluation_id uuid, p_stage_code integer, p_new_status text, p_changed_by text DEFAULT 'admin'::text, p_notes text DEFAULT NULL::text, p_origin text DEFAULT 'manual'::text, p_extra_fields jsonb DEFAULT '{}'::jsonb, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status text;
  v_current_version integer;
  v_allowed text[];
  v_transition_map jsonb := '{
    "pendente": ["disponivel", "cancelado"],
    "disponivel": ["em_andamento", "aguardando_proposta", "agendado", "realizado", "concluida", "cancelado"],
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
BEGIN
  SELECT status, version INTO v_current_status, v_current_version
  FROM journey_stages
  WHERE evaluation_id = p_evaluation_id AND stage_code = p_stage_code
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', format('Etapa %s não encontrada', p_stage_code));
  END IF;

  IF p_expected_version IS NOT NULL AND v_current_version != p_expected_version THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conflito de concorrência: esta etapa foi modificada por outro usuário. Recarregue e tente novamente.');
  END IF;

  v_allowed_arr := v_transition_map -> v_current_status;
  IF v_allowed_arr IS NULL OR NOT v_allowed_arr ? p_new_status THEN
    RETURN jsonb_build_object('success', false, 'error', format('Transição inválida: etapa %s de %s → %s', p_stage_code, v_current_status, p_new_status));
  END IF;

  UPDATE journey_stages
  SET status = p_new_status,
      version = version + 1,
      completed_at = CASE WHEN p_new_status IN ('concluida', 'realizado') THEN now() ELSE completed_at END,
      scheduled_date = CASE WHEN p_extra_fields ? 'scheduled_date' THEN (p_extra_fields->>'scheduled_date')::date ELSE scheduled_date END,
      updated_at = now()
  WHERE evaluation_id = p_evaluation_id AND stage_code = p_stage_code;

  INSERT INTO stage_audit_logs (evaluation_id, stage_code, from_status, to_status, action, changed_by, notes, origin)
  VALUES (p_evaluation_id, p_stage_code, v_current_status, p_new_status,
          format('stage%s:%s→%s', p_stage_code, v_current_status, p_new_status),
          p_changed_by, p_notes, p_origin);

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
$function$