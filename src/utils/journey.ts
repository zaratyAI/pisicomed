import { supabase } from "@/integrations/supabase/client";
import { JOURNEY_STAGES } from "@/data/journeyStages";
import { StageData } from "@/components/JourneyTimeline";

export async function createJourneyForEvaluation(evaluationId: string): Promise<void> {
  const stages = JOURNEY_STAGES.map((s) => ({
    evaluation_id: evaluationId,
    stage_code: s.code,
    stage_name: s.name,
    status: s.code === 1 ? "concluida" : "pendente",
    completed_at: s.code === 1 ? new Date().toISOString() : null,
  }));

  const { error } = await supabase.from("journey_stages").insert(stages);
  if (error) {
    console.error("Error creating journey stages:", error);
    throw error;
  }

  // Mark stage 2 as available after stage 1 is completed
  await supabase
    .from("journey_stages")
    .update({ status: "disponivel" })
    .eq("evaluation_id", evaluationId)
    .eq("stage_code", 2);
}

export async function getJourneyStages(evaluationId: string): Promise<StageData[]> {
  const { data, error } = await supabase
    .from("journey_stages")
    .select("*")
    .eq("evaluation_id", evaluationId)
    .order("stage_code", { ascending: true });

  if (error) {
    console.error("Error loading journey stages:", error);
    return [];
  }

  return (data || []).map((s: any) => ({
    stage_code: s.stage_code,
    stage_name: s.stage_name,
    status: s.status,
    scheduled_date: s.scheduled_date,
  }));
}

export async function updateStageStatus(
  evaluationId: string,
  stageCode: number,
  status: string,
  extraFields?: Record<string, any>
): Promise<void> {
  const update: Record<string, any> = { status };
  if (status === "concluida") {
    update.completed_at = new Date().toISOString();
  }
  if (extraFields) {
    Object.assign(update, extraFields);
  }

  const { error } = await supabase
    .from("journey_stages")
    .update(update)
    .eq("evaluation_id", evaluationId)
    .eq("stage_code", stageCode);

  if (error) throw error;
}

export async function requestQuote(params: {
  companyId: string;
  evaluationId: string;
  requesterName: string;
  requesterRole: string;
  requesterCpf: string;
  requesterEmail: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("quote_requests")
    .insert({
      company_id: params.companyId,
      evaluation_id: params.evaluationId,
      requester_name: params.requesterName,
      requester_role: params.requesterRole,
      requester_cpf: params.requesterCpf,
      requester_email: params.requesterEmail,
      status: "requested",
    })
    .select("id")
    .single();

  if (error) throw error;

  // Update stage 2 to aguardando_proposta
  await updateStageStatus(params.evaluationId, 2, "aguardando_proposta");

  return data.id;
}

export async function getQuoteRequest(evaluationId: string) {
  const { data } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("evaluation_id", evaluationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
