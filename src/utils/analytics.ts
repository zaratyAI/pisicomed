import { PipelineStatus } from "@/utils/pipeline";
import { differenceInDays, differenceInHours, parseISO } from "date-fns";

export interface AnalyticsData {
  // Volume
  totalCases: number;
  byPipelineStatus: Record<string, number>;
  byPeriod: { label: string; count: number }[];

  // Conversions
  conversionRates: {
    proposalToAccept: number | null;
    acceptToSchedule: number | null;
    scheduleToRealization: number | null;
    overallConversion: number | null;
    cancellationRate: number | null;
  };

  // Time metrics
  avgTimePerStage: { stage: string; avgDays: number; count: number }[];
  avgTotalDays: number | null;

  // Bottlenecks & backlog
  bottlenecks: { stage: string; avgDays: number; count: number }[];
  stalledCases: { id: string; companyName: string; status: string; daysSinceUpdate: number }[];
  backlogByStatus: { status: string; label: string; count: number }[];

  // Top entities
  topCompanies: { name: string; count: number }[];
  topEvaluators: { name: string; count: number }[];
}

const PIPELINE_ORDER: PipelineStatus[] = [
  "avaliacao_inicial",
  "proposta_solicitada",
  "proposta_enviada",
  "proposta_aceita",
  "agendamento_pendente",
  "agendado",
  "em_realizacao",
  "em_analise",
  "finalizado",
  "cancelado",
  "nao_convertido",
];

const PIPELINE_LABELS: Record<string, string> = {
  avaliacao_inicial: "Diagnóstico inicial",
  proposta_solicitada: "Proposta solicitada",
  proposta_enviada: "Proposta enviada",
  proposta_aceita: "Proposta aprovada",
  agendamento_pendente: "Aguardando agendamento",
  agendado: "Avaliação agendada",
  em_realizacao: "Em execução",
  em_analise: "Análise técnica",
  finalizado: "Concluído",
  cancelado: "Cancelado",
  nao_convertido: "Não convertido",
};

export function computeAnalytics(
  evaluations: any[],
  journeyMap: Record<string, any[]>,
  auditLogs: any[]
): AnalyticsData {
  const totalCases = evaluations.length;

  // By pipeline status
  const byPipelineStatus: Record<string, number> = {};
  PIPELINE_ORDER.forEach((s) => (byPipelineStatus[s] = 0));
  evaluations.forEach((ev) => {
    const ps = ev.pipeline_status || "avaliacao_inicial";
    byPipelineStatus[ps] = (byPipelineStatus[ps] || 0) + 1;
  });

  // By period (last 6 months)
  const byPeriod: { label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    const count = evaluations.filter((ev) => {
      const created = new Date(ev.created_at);
      return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
    }).length;
    byPeriod.push({ label, count });
  }

  // Conversion rates
  const reached = (status: string) =>
    evaluations.filter((ev) => {
      const idx = PIPELINE_ORDER.indexOf(ev.pipeline_status as PipelineStatus);
      const targetIdx = PIPELINE_ORDER.indexOf(status as PipelineStatus);
      // terminal statuses
      if (ev.pipeline_status === "cancelado" || ev.pipeline_status === "nao_convertido") {
        return false;
      }
      return idx >= targetIdx;
    }).length;

  const reachedWithTerminal = (status: string) =>
    evaluations.filter((ev) => {
      const idx = PIPELINE_ORDER.indexOf(ev.pipeline_status as PipelineStatus);
      const targetIdx = PIPELINE_ORDER.indexOf(status as PipelineStatus);
      return idx >= targetIdx;
    }).length;

  const proposalSent = reachedWithTerminal("proposta_enviada");
  const proposalAccepted = reached("proposta_aceita");
  const scheduled = reached("agendado");
  const realized = reached("em_realizacao");
  const finalized = byPipelineStatus["finalizado"] || 0;
  const cancelled = byPipelineStatus["cancelado"] || 0;
  const notConverted = byPipelineStatus["nao_convertido"] || 0;

  const safeRate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : null);

  const conversionRates = {
    proposalToAccept: safeRate(proposalAccepted, proposalSent),
    acceptToSchedule: safeRate(scheduled, proposalAccepted),
    scheduleToRealization: safeRate(realized, scheduled),
    overallConversion: safeRate(finalized, totalCases),
    cancellationRate: safeRate(cancelled + notConverted, totalCases),
  };

  // Avg time per stage from audit logs
  const stageTransitions: Record<number, number[]> = {};
  const sortedLogs = [...auditLogs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Group logs by evaluation
  const logsByEval: Record<string, any[]> = {};
  sortedLogs.forEach((log) => {
    if (!logsByEval[log.evaluation_id]) logsByEval[log.evaluation_id] = [];
    logsByEval[log.evaluation_id].push(log);
  });

  // Calculate time per stage from journey_stages data
  const stageNames: Record<number, string> = {
    1: "Diagnóstico inicial",
    2: "Proposta comercial",
    3: "Agendamento técnico",
    4: "Avaliação com lideranças",
    5: "Pesquisa organizacional",
    6: "Análise técnica",
    7: "Atualização do PGR",
    8: "Processo concluído",
  };

  const stageDurations: Record<number, number[]> = {};
  Object.values(journeyMap).forEach((stages) => {
    stages.forEach((stage: any) => {
      if (stage.completed_at && stage.created_at) {
        const days = differenceInDays(parseISO(stage.completed_at), parseISO(stage.created_at));
        if (days >= 0) {
          if (!stageDurations[stage.stage_code]) stageDurations[stage.stage_code] = [];
          stageDurations[stage.stage_code].push(days);
        }
      }
    });
  });

  const avgTimePerStage = Object.entries(stageDurations).map(([code, durations]) => ({
    stage: stageNames[Number(code)] || `Etapa ${code}`,
    avgDays: Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10,
    count: durations.length,
  }));

  // Overall avg days
  const completedEvals = evaluations.filter((ev) => ev.finished_at);
  const avgTotalDays =
    completedEvals.length > 0
      ? Math.round(
          completedEvals.reduce((acc, ev) => {
            return acc + differenceInDays(parseISO(ev.finished_at), parseISO(ev.created_at));
          }, 0) / completedEvals.length
        )
      : null;

  // Bottlenecks: stages with longest avg time
  const bottlenecks = [...avgTimePerStage].sort((a, b) => b.avgDays - a.avgDays).slice(0, 3);

  // Stalled cases: no update in > 7 days, not finalized/cancelled
  const terminalStatuses = ["finalizado", "cancelado", "nao_convertido"];
  const stalledCases = evaluations
    .filter((ev) => !terminalStatuses.includes(ev.pipeline_status))
    .map((ev) => ({
      id: ev.id,
      companyName: ev.companies?.legal_name || "N/A",
      status: ev.pipeline_status || "avaliacao_inicial",
      daysSinceUpdate: differenceInDays(now, parseISO(ev.updated_at)),
    }))
    .filter((c) => c.daysSinceUpdate > 7)
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
    .slice(0, 15);

  // Backlog by status (active only)
  const backlogByStatus = PIPELINE_ORDER.filter((s) => !terminalStatuses.includes(s))
    .map((s) => ({
      status: s,
      label: PIPELINE_LABELS[s] || s,
      count: byPipelineStatus[s] || 0,
    }))
    .filter((b) => b.count > 0);

  // Top companies
  const companyCount: Record<string, { name: string; count: number }> = {};
  evaluations.forEach((ev) => {
    const name = ev.companies?.legal_name || "N/A";
    if (!companyCount[name]) companyCount[name] = { name, count: 0 };
    companyCount[name].count++;
  });
  const topCompanies = Object.values(companyCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top evaluators
  const evalCount: Record<string, { name: string; count: number }> = {};
  evaluations.forEach((ev) => {
    const name = ev.evaluators?.name || "N/A";
    if (!evalCount[name]) evalCount[name] = { name, count: 0 };
    evalCount[name].count++;
  });
  const topEvaluators = Object.values(evalCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalCases,
    byPipelineStatus,
    byPeriod,
    conversionRates,
    avgTimePerStage,
    avgTotalDays,
    bottlenecks,
    stalledCases,
    backlogByStatus,
    topCompanies,
    topEvaluators,
  };
}

export function getPipelineLabel(status: string): string {
  return PIPELINE_LABELS[status] || status;
}
