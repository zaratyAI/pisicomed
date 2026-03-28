import { supabase } from "@/integrations/supabase/client";

// ─── Pipeline Status (high-level funnel on evaluations table) ───
export type PipelineStatus =
  | "avaliacao_inicial"
  | "proposta_solicitada"
  | "proposta_enviada"
  | "proposta_aceita"
  | "agendamento_pendente"
  | "agendado"
  | "em_realizacao"
  | "em_analise"
  | "finalizado"
  | "cancelado"
  | "nao_convertido";

// ─── Stage-level statuses (on journey_stages table) ───
export type StageStatus =
  | "pendente"
  | "disponivel"
  | "em_andamento"
  | "aguardando_proposta"
  | "proposta_enviada"
  | "proposta_aceita"
  | "agendado"
  | "realizado"
  | "concluida"
  | "cancelado";

// ─── Audit origin types ───
export type AuditOrigin = "manual" | "automatico" | "sistema";

// ─── Transition rules (kept for UI-side checks / button visibility) ───
const STAGE_TRANSITIONS: Record<string, string[]> = {
  pendente: ["disponivel", "cancelado"],
  disponivel: ["em_andamento", "aguardando_proposta", "agendado", "realizado", "concluida", "cancelado"],
  em_andamento: ["aguardando_proposta", "agendado", "concluida", "cancelado"],
  aguardando_proposta: ["proposta_enviada", "cancelado"],
  proposta_enviada: ["proposta_aceita", "aguardando_proposta", "cancelado", "nao_convertido"],
  proposta_aceita: ["concluida", "cancelado"],
  agendado: ["realizado", "agendado", "cancelado"],
  realizado: ["concluida"],
  concluida: [],
  cancelado: [],
};

const PIPELINE_TRANSITIONS: Record<string, string[]> = {
  avaliacao_inicial: ["proposta_solicitada", "cancelado", "nao_convertido"],
  proposta_solicitada: ["proposta_enviada", "cancelado", "nao_convertido"],
  proposta_enviada: ["proposta_aceita", "proposta_solicitada", "cancelado", "nao_convertido"],
  proposta_aceita: ["agendamento_pendente", "cancelado"],
  agendamento_pendente: ["agendado", "cancelado"],
  agendado: ["em_realizacao", "agendamento_pendente", "cancelado"],
  em_realizacao: ["em_analise", "cancelado"],
  em_analise: ["finalizado", "cancelado"],
  finalizado: [],
  cancelado: [],
  nao_convertido: [],
};

// ─── Pipeline Labels ───
export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  avaliacao_inicial: "Diagnóstico inicial concluído",
  proposta_solicitada: "Proposta comercial solicitada",
  proposta_enviada: "Proposta comercial enviada",
  proposta_aceita: "Proposta aprovada pelo cliente",
  agendamento_pendente: "Aguardando agendamento",
  agendado: "Avaliação agendada",
  em_realizacao: "Avaliação em execução",
  em_analise: "Análise técnica em andamento",
  finalizado: "Processo concluído",
  cancelado: "Processo cancelado",
  nao_convertido: "Não convertido",
};

export const PIPELINE_COLORS: Record<PipelineStatus, { bg: string; text: string }> = {
  avaliacao_inicial: { bg: "bg-blue-100", text: "text-blue-700" },
  proposta_solicitada: { bg: "bg-amber-100", text: "text-amber-700" },
  proposta_enviada: { bg: "bg-indigo-100", text: "text-indigo-700" },
  proposta_aceita: { bg: "bg-emerald-100", text: "text-emerald-700" },
  agendamento_pendente: { bg: "bg-orange-100", text: "text-orange-700" },
  agendado: { bg: "bg-blue-100", text: "text-blue-700" },
  em_realizacao: { bg: "bg-purple-100", text: "text-purple-700" },
  em_analise: { bg: "bg-cyan-100", text: "text-cyan-700" },
  finalizado: { bg: "bg-emerald-100", text: "text-emerald-700" },
  cancelado: { bg: "bg-red-100", text: "text-red-700" },
  nao_convertido: { bg: "bg-gray-100", text: "text-gray-500" },
};

// ─── Client-side helpers (for UI button visibility only) ───

export function canTransitionStage(fromStatus: string, toStatus: string): boolean {
  const allowed = STAGE_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

export function canTransitionPipeline(fromStatus: string, toStatus: string): boolean {
  const allowed = PIPELINE_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

export function getAvailablePipelineTransitions(currentStatus: string): PipelineStatus[] {
  return (PIPELINE_TRANSITIONS[currentStatus] || []) as PipelineStatus[];
}

export function getAvailableStageTransitions(currentStatus: string): StageStatus[] {
  return (STAGE_TRANSITIONS[currentStatus] || []) as StageStatus[];
}

// ─── Backend-validated actions via Edge Function ───

async function invokePipelineAction(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("pipeline-action", {
    body: payload,
  });

  if (error) {
    // Try to parse error body
    throw new Error(error.message || "Erro ao executar ação no servidor");
  }

  if (data && !data.success) {
    throw new Error(data.error || "Erro desconhecido no servidor");
  }

  return data;
}

export async function handleProposalSent(
  evaluationId: string,
  proposalLink: string,
  changedBy?: string,
  notes?: string
): Promise<void> {
  await invokePipelineAction({
    action: "proposal_sent",
    evaluation_id: evaluationId,
    proposal_link: proposalLink,
    changed_by: changedBy,
    notes,
  });
}

export async function handleProposalAccepted(
  evaluationId: string,
  changedBy?: string,
  notes?: string
): Promise<void> {
  await invokePipelineAction({
    action: "proposal_accepted",
    evaluation_id: evaluationId,
    changed_by: changedBy,
    notes,
  });
}

export async function handleProposalRejected(
  evaluationId: string,
  changedBy?: string,
  notes?: string
): Promise<void> {
  await invokePipelineAction({
    action: "proposal_rejected",
    evaluation_id: evaluationId,
    changed_by: changedBy,
    notes,
  });
}

export async function handleProposalAdjustment(
  evaluationId: string,
  changedBy?: string,
  notes?: string
): Promise<void> {
  await invokePipelineAction({
    action: "proposal_adjustment",
    evaluation_id: evaluationId,
    changed_by: changedBy,
    notes,
  });
}

export async function handleProposalReopen(
  evaluationId: string,
  changedBy?: string,
  notes?: string
): Promise<void> {
  await invokePipelineAction({
    action: "proposal_reopen",
    evaluation_id: evaluationId,
    changed_by: changedBy,
    notes,
  });
}

export async function handleScheduleAppointment(
  evaluationId: string,
  stageCode: number,
  scheduledDate: string,
  changedBy?: string,
  notes?: string
): Promise<void> {
  await invokePipelineAction({
    action: "schedule",
    evaluation_id: evaluationId,
    stage_code: stageCode,
    scheduled_date: scheduledDate,
    changed_by: changedBy,
    notes,
  });
}

export async function handleReschedule(
  evaluationId: string,
  stageCode: number,
  newDate: string,
  changedBy?: string,
  notes?: string
): Promise<void> {
  await invokePipelineAction({
    action: "reschedule",
    evaluation_id: evaluationId,
    stage_code: stageCode,
    scheduled_date: newDate,
    changed_by: changedBy,
    notes,
  });
}

export async function handleStageRealized(
  evaluationId: string,
  stageCode: number,
  changedBy?: string,
  notes?: string
): Promise<void> {
  await invokePipelineAction({
    action: "realize",
    evaluation_id: evaluationId,
    stage_code: stageCode,
    changed_by: changedBy,
    notes,
  });
}

export async function handleStageCompleted(
  evaluationId: string,
  stageCode: number,
  changedBy?: string,
  notes?: string
): Promise<void> {
  await invokePipelineAction({
    action: "complete",
    evaluation_id: evaluationId,
    stage_code: stageCode,
    changed_by: changedBy,
    notes,
  });
}

export async function handleCancelEvaluation(
  evaluationId: string,
  reason: string,
  changedBy?: string
): Promise<void> {
  await invokePipelineAction({
    action: "cancel",
    evaluation_id: evaluationId,
    reason,
    changed_by: changedBy,
  });
}

// ─── Read-only operations (stay client-side) ───

export async function updatePipelineStatus(
  evaluationId: string,
  newStatus: PipelineStatus,
  changedBy?: string,
  notes?: string,
  origin: AuditOrigin = "manual"
): Promise<void> {
  const { data } = await supabase.rpc("transition_pipeline_safe", {
    p_evaluation_id: evaluationId,
    p_new_status: newStatus,
    p_changed_by: changedBy || "admin",
    p_notes: notes || null,
    p_origin: origin,
  });

  const result = data as Record<string, unknown> | null;
  if (result && !result.success) {
    throw new Error((result.error as string) || "Erro na transição de pipeline");
  }
}

export async function logStageChange(params: {
  evaluationId: string;
  stageCode?: number;
  fromStatus: string;
  toStatus: string;
  action: string;
  changedBy?: string;
  notes?: string;
  origin?: AuditOrigin;
}): Promise<void> {
  const { error } = await supabase.from("stage_audit_logs").insert({
    evaluation_id: params.evaluationId,
    stage_code: params.stageCode || null,
    from_status: params.fromStatus,
    to_status: params.toStatus,
    action: params.action,
    changed_by: params.changedBy || "admin",
    notes: params.notes || null,
    origin: params.origin || "manual",
  });
  if (error) console.error("Audit log error:", error);
}

// ─── Email actions via Edge Function ───

export async function sendActionPlanEmail(
  evaluationId: string,
  recipientEmail?: string,
  customMessage?: string
): Promise<{ success: boolean; sent_to?: string }> {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: {
      action: "send_action_plan",
      evaluation_id: evaluationId,
      recipient_email: recipientEmail,
      custom_message: customMessage,
    },
  });
  if (error) throw new Error(error.message || "Erro ao enviar email");
  if (data && !data.success) throw new Error(data.error || "Erro no envio");
  return data;
}

export async function sendAdminReport(
  evaluationId: string,
  recipientEmail: string,
  ccEmails?: string,
  subject?: string,
  customMessage?: string
): Promise<{ success: boolean; sent_to?: string }> {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: {
      action: "send_admin_report",
      evaluation_id: evaluationId,
      recipient_email: recipientEmail,
      cc_emails: ccEmails,
      subject,
      custom_message: customMessage,
    },
  });
  if (error) throw new Error(error.message || "Erro ao enviar email");
  if (data && !data.success) throw new Error(data.error || "Erro no envio");
  return data;
}

export async function getAuditHistory(evaluationId: string) {
  const { data, error } = await supabase
    .from("stage_audit_logs")
    .select("*")
    .eq("evaluation_id", evaluationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─── Precondition checks (kept for UI hints only, real validation is server-side) ───

export interface PreconditionResult {
  valid: boolean;
  error?: string;
}

export async function checkSchedulePrecondition(
  evaluationId: string,
  stageCode: number,
  scheduledDate: string
): Promise<PreconditionResult> {
  if (!scheduledDate) return { valid: false, error: "Data de agendamento é obrigatória" };
  const dateObj = new Date(scheduledDate + "T00:00:00");
  if (isNaN(dateObj.getTime())) return { valid: false, error: "Data inválida" };
  return { valid: true };
}

export async function checkRealizationPrecondition(
  evaluationId: string,
  stageCode: number
): Promise<PreconditionResult> {
  return { valid: true };
}

export async function checkCompletionPrecondition(
  evaluationId: string,
  stageCode: number
): Promise<PreconditionResult> {
  return { valid: true };
}

export async function checkProposalSentPrecondition(
  evaluationId: string,
  proposalLink: string
): Promise<PreconditionResult> {
  if (!proposalLink?.trim()) return { valid: false, error: "Link da proposta é obrigatório" };
  try { new URL(proposalLink); } catch { return { valid: false, error: "URL inválida" }; }
  return { valid: true };
}

export async function checkProposalAcceptedPrecondition(
  evaluationId: string
): Promise<PreconditionResult> {
  return { valid: true };
}

export async function checkFinalizationPrecondition(
  evaluationId: string
): Promise<PreconditionResult> {
  return { valid: true };
}

export async function transitionStage(params: {
  evaluationId: string;
  stageCode: number;
  newStatus: StageStatus;
  changedBy?: string;
  notes?: string;
  extraFields?: Record<string, unknown>;
  origin?: AuditOrigin;
}): Promise<void> {
  const { data } = await supabase.rpc("transition_stage_safe", {
    p_evaluation_id: params.evaluationId,
    p_stage_code: params.stageCode,
    p_new_status: params.newStatus,
    p_changed_by: params.changedBy || "admin",
    p_notes: params.notes || null,
    p_origin: params.origin || "manual",
    p_extra_fields: params.extraFields ? JSON.stringify(params.extraFields) : "{}",
  });

  const result = data as Record<string, unknown> | null;
  if (result && !result.success) {
    throw new Error((result.error as string) || "Erro na transição de etapa");
  }
}
