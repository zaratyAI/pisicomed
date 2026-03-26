import { StageData } from "@/components/JourneyTimeline";
import { PipelineStatus } from "@/utils/pipeline";

export interface CaseAlert {
  type: "overdue" | "stalled" | "upcoming" | "no_action";
  label: string;
  severity: "warning" | "danger" | "info";
}

const STALLED_DAYS = 7;
const UPCOMING_DAYS = 3;

export function getCaseAlerts(
  pipelineStatus: PipelineStatus,
  stages: StageData[],
  createdAt: string,
  quote?: any
): CaseAlert[] {
  const alerts: CaseAlert[] = [];
  const now = new Date();

  // Check for stalled cases (no progress in X days)
  const daysSinceCreation = Math.floor(
    (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const terminalStatuses: PipelineStatus[] = ["finalizado", "cancelado"];
  if (terminalStatuses.includes(pipelineStatus)) return alerts;

  // Check for upcoming scheduled dates
  for (const stage of stages) {
    if (stage.scheduled_date && stage.status === "agendado") {
      const schedDate = new Date(stage.scheduled_date + "T00:00:00");
      const daysUntil = Math.floor(
        (schedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil < 0) {
        alerts.push({
          type: "overdue",
          label: `Etapa ${stage.stage_code} atrasada (${Math.abs(daysUntil)}d)`,
          severity: "danger",
        });
      } else if (daysUntil <= UPCOMING_DAYS) {
        alerts.push({
          type: "upcoming",
          label: `Etapa ${stage.stage_code} em ${daysUntil}d`,
          severity: "info",
        });
      }
    }
  }

  // Check for stalled pipeline
  const activeStages = stages.filter(
    (s) => s.status !== "pendente" && s.status !== "concluida" && s.status !== "cancelado"
  );
  if (activeStages.length === 0 && daysSinceCreation > STALLED_DAYS) {
    alerts.push({
      type: "stalled",
      label: `Parado há ${daysSinceCreation}d`,
      severity: "warning",
    });
  }

  // Check if proposal was sent but not responded
  if (
    pipelineStatus === "proposta_enviada" &&
    quote?.proposal_link &&
    !quote?.proposal_status
  ) {
    const proposalAge = quote.updated_at
      ? Math.floor(
          (now.getTime() - new Date(quote.updated_at).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : daysSinceCreation;
    if (proposalAge > 5) {
      alerts.push({
        type: "stalled",
        label: `Proposta sem resposta há ${proposalAge}d`,
        severity: "warning",
      });
    }
  }

  return alerts;
}

export function getNextAction(
  pipelineStatus: PipelineStatus,
  stages: StageData[],
  quote?: any
): string | null {
  switch (pipelineStatus) {
    case "avaliacao_inicial":
      return "Cliente concluiu diagnóstico inicial — aguardando solicitação de proposta";
    case "proposta_solicitada":
      return "Elaborar e enviar proposta comercial ao cliente";
    case "proposta_enviada":
      return "Proposta enviada — aguardando aprovação do cliente";
    case "proposta_aceita":
      return "Proposta aprovada — agendar avaliação técnica";
    case "agendamento_pendente": {
      const needsSchedule = stages.find(
        (s) => s.status === "disponivel" || s.status === "em_andamento"
      );
      return needsSchedule
        ? `Definir data para a etapa ${needsSchedule.stage_code}`
        : "Confirmar data do agendamento técnico";
    }
    case "agendado": {
      const scheduled = stages.find((s) => s.status === "agendado");
      if (scheduled?.scheduled_date) {
        return `Avaliação agendada para ${new Date(
          scheduled.scheduled_date + "T00:00:00"
        ).toLocaleDateString("pt-BR")} — aguardando execução`;
      }
      return "Avaliação agendada — aguardando execução";
    }
    case "em_realizacao":
      return "Registrar conclusão da etapa em execução";
    case "em_analise":
      return "Finalizar análise técnica e emitir relatório";
    case "finalizado":
      return null;
    case "cancelado":
      return null;
    default:
      return "Verificar próximo passo do processo";
  }
}
