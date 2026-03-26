import { supabase } from "@/integrations/supabase/client";
import { CompanyData } from "./cnpj";
import { ActionItem } from "./actionPlan";

export interface EvaluatorData {
  name: string;
  cpf: string;
  email: string;
  roleTitle: string;
}

export interface EvaluationRecord {
  id: string;
  company: CompanyData;
  evaluator: EvaluatorData;
  status: string;
  startedAt: string;
  finishedAt?: string;
  totalQuestions: number;
  totalActions: number;
  answers: Record<string, { answer: string; notes?: string }>;
  actionPlan: ActionItem[];
}

export async function upsertCompany(company: CompanyData, accessCpf?: string): Promise<string> {
  const cnpjClean = company.cnpj.replace(/\D/g, "");
  
  const { data: existing } = await supabase
    .from("companies")
    .select("id, access_cpf")
    .eq("cnpj", cnpjClean)
    .maybeSingle();

  if (existing) {
    const updateData: Record<string, any> = {
      legal_name: company.legalName,
      trade_name: company.tradeName || null,
      address: company.address,
      city: company.city,
      state: company.state,
      zip_code: company.zipCode,
      status: company.status,
    };
    if (!existing.access_cpf && accessCpf) {
      updateData.access_cpf = accessCpf;
    }
    await supabase.from("companies").update(updateData as any).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase.from("companies").insert({
    cnpj: cnpjClean,
    legal_name: company.legalName,
    trade_name: company.tradeName || null,
    address: company.address,
    city: company.city,
    state: company.state,
    zip_code: company.zipCode,
    status: company.status,
    access_cpf: accessCpf || null,
  } as any).select("id").single();

  if (error) throw error;
  return data.id;
}

export async function upsertEvaluator(evaluator: EvaluatorData): Promise<string> {
  const cpfClean = evaluator.cpf.replace(/\D/g, "");

  const { data: existing } = await supabase
    .from("evaluators")
    .select("id")
    .eq("cpf", cpfClean)
    .maybeSingle();

  if (existing) {
    await supabase.from("evaluators").update({
      name: evaluator.name,
      email: evaluator.email,
      role_title: evaluator.roleTitle,
    }).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase.from("evaluators").insert({
    name: evaluator.name,
    cpf: cpfClean,
    email: evaluator.email,
    role_title: evaluator.roleTitle,
  }).select("id").single();

  if (error) throw error;
  return data.id;
}

export async function createEvaluation(companyId: string, evaluatorId: string, totalQuestions: number, unitId?: string): Promise<string> {
  const insertData: Record<string, any> = {
    company_id: companyId,
    evaluator_id: evaluatorId,
    total_questions: totalQuestions,
    status: "in_progress",
  };
  if (unitId) insertData.unit_id = unitId;

  const { data, error } = await supabase.from("evaluations").insert(insertData as any).select("id").single();

  if (error) throw error;
  return data.id;
}

export async function saveAnswer(evaluationId: string, questionCode: string, answer: string, notes?: string) {
  const { error } = await supabase.from("answers").upsert({
    evaluation_id: evaluationId,
    question_code: questionCode,
    answer,
    notes: notes || null,
  }, { onConflict: "evaluation_id,question_code" });

  if (error) throw error;
}

export async function finalizeEvaluation(
  evaluationId: string,
  actionPlan: ActionItem[],
  summaryJson: Record<string, unknown>
) {
  if (actionPlan.length > 0) {
    const items = actionPlan.map((a) => ({
      evaluation_id: evaluationId,
      question_code: a.questionCode,
      question_title: a.questionTitle,
      answer: a.answer,
      action_text: a.actionText,
      classification: a.classification,
      priority: a.priority,
      theme: a.theme,
      block: a.block,
    }));

    const { error } = await supabase.from("action_plans").insert(items);
    if (error) throw error;
  }

  const { error } = await supabase.from("evaluations").update({
    finished_at: new Date().toISOString(),
    status: "completed",
    total_actions: actionPlan.length,
    summary_json: summaryJson as any,
  }).eq("id", evaluationId);

  if (error) throw error;
}

// ─── Optimized: Batch queries instead of N+1 ───
export async function getEvaluationsByCompanyCnpj(cnpj: string): Promise<EvaluationRecord[]> {
  const cnpjClean = cnpj.replace(/\D/g, "");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("cnpj", cnpjClean)
    .maybeSingle();

  if (!company) return [];

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("*, evaluators(*)")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (!evaluations || evaluations.length === 0) return [];

  const evalIds = evaluations.map((ev) => ev.id);

  // Batch: fetch all answers and actions in parallel instead of N+1
  const [{ data: allAnswers }, { data: allActions }] = await Promise.all([
    supabase.from("answers").select("*").in("evaluation_id", evalIds),
    supabase.from("action_plans").select("*").in("evaluation_id", evalIds),
  ]);

  // Group by evaluation_id
  const answersMap: Record<string, Record<string, { answer: string; notes?: string }>> = {};
  (allAnswers || []).forEach((a: any) => {
    if (!answersMap[a.evaluation_id]) answersMap[a.evaluation_id] = {};
    answersMap[a.evaluation_id][a.question_code] = { answer: a.answer, notes: a.notes };
  });

  const actionsMap: Record<string, any[]> = {};
  (allActions || []).forEach((a: any) => {
    if (!actionsMap[a.evaluation_id]) actionsMap[a.evaluation_id] = [];
    actionsMap[a.evaluation_id].push(a);
  });

  return evaluations.map((ev) => {
    const evaluator = ev.evaluators as any;
    return {
      id: ev.id,
      company: {
        cnpj: company.cnpj,
        legalName: company.legal_name,
        tradeName: company.trade_name || "",
        address: company.address || "",
        city: company.city || "",
        state: company.state || "",
        zipCode: company.zip_code || "",
        status: company.status || "",
      },
      evaluator: {
        name: evaluator?.name || "",
        cpf: evaluator?.cpf || "",
        email: evaluator?.email || "",
        roleTitle: evaluator?.role_title || "",
      },
      status: ev.status || "in_progress",
      startedAt: ev.started_at || ev.created_at,
      finishedAt: ev.finished_at || undefined,
      totalQuestions: ev.total_questions || 0,
      totalActions: ev.total_actions || 0,
      answers: answersMap[ev.id] || {},
      actionPlan: (actionsMap[ev.id] || []).map((a: any) => ({
        questionCode: a.question_code,
        questionTitle: a.question_title,
        answer: a.answer,
        actionText: a.action_text,
        classification: a.classification,
        priority: a.priority,
        theme: a.theme,
        block: a.block,
      })),
    };
  });
}

// ─── Paginated evaluations for admin dashboard ───
export interface PaginatedResult {
  data: any[];
  total: number;
  limit: number;
  offset: number;
}

export async function getEvaluationsPaginated(params: {
  limit?: number;
  offset?: number;
  pipelineStatus?: string;
  search?: string;
  orderBy?: string;
  orderDir?: string;
}): Promise<PaginatedResult> {
  const { data, error } = await supabase.rpc("get_evaluations_paginated", {
    p_limit: params.limit || 50,
    p_offset: params.offset || 0,
    p_pipeline_status: params.pipelineStatus || null,
    p_search: params.search || null,
    p_order_by: params.orderBy || "created_at",
    p_order_dir: params.orderDir || "desc",
  });

  if (error) throw error;

  const result = data as any;
  return {
    data: result.data || [],
    total: result.total || 0,
    limit: result.limit || 50,
    offset: result.offset || 0,
  };
}

// Legacy function - kept for backward compatibility but prefer paginated version
export async function getAllEvaluations(): Promise<any[]> {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*, companies(*), evaluators(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function logEmailSend(
  evaluationId: string,
  recipientEmail: string,
  ccEmail: string,
  subject: string,
  status: string,
  errorMessage?: string
) {
  await supabase.from("email_logs").insert({
    evaluation_id: evaluationId,
    recipient_email: recipientEmail,
    cc_email: ccEmail,
    subject,
    status,
    error_message: errorMessage || null,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
}
