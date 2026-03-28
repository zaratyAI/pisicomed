-- Auto-create journey_stages when evaluation is marked as completed
CREATE OR REPLACE FUNCTION public.ensure_journey_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    IF NOT EXISTS (SELECT 1 FROM journey_stages WHERE evaluation_id = NEW.id LIMIT 1) THEN
      INSERT INTO journey_stages (evaluation_id, stage_code, stage_name, status, completed_at) VALUES
        (NEW.id, 1, 'Diagnóstico inicial', 'concluida', now()),
        (NEW.id, 2, 'Proposta comercial', 'disponivel', NULL),
        (NEW.id, 3, 'Agendamento técnico', 'pendente', NULL),
        (NEW.id, 4, 'Avaliação com lideranças', 'pendente', NULL),
        (NEW.id, 5, 'Pesquisa organizacional', 'pendente', NULL),
        (NEW.id, 6, 'Análise técnica', 'pendente', NULL),
        (NEW.id, 7, 'Atualização do PGR', 'pendente', NULL),
        (NEW.id, 8, 'Processo concluído', 'pendente', NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_journey_stages_on_complete ON public.evaluations;
CREATE TRIGGER ensure_journey_stages_on_complete
  AFTER UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.ensure_journey_stages();

DROP TRIGGER IF EXISTS ensure_journey_stages_on_insert ON public.evaluations;
CREATE TRIGGER ensure_journey_stages_on_insert
  AFTER INSERT ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.ensure_journey_stages();
