import { JOURNEY_STAGES, StageStatus } from "@/data/journeyStages";
import { CheckCircle2, Circle, Clock, ArrowRight, CalendarDays } from "lucide-react";

export interface StageData {
  stage_code: number;
  stage_name: string;
  status: StageStatus;
  scheduled_date?: string | null;
}

interface JourneyTimelineProps {
  stages: StageData[];
}

const statusConfig: Record<string, { color: string; bgColor: string; label: string; icon: typeof CheckCircle2 }> = {
  concluida: { color: "text-emerald-600", bgColor: "bg-emerald-500", label: "Concluída", icon: CheckCircle2 },
  realizado: { color: "text-emerald-600", bgColor: "bg-emerald-500", label: "Executada com sucesso", icon: CheckCircle2 },
  em_andamento: { color: "text-blue-600", bgColor: "bg-blue-500", label: "Em execução", icon: ArrowRight },
  aguardando_acao: { color: "text-amber-600", bgColor: "bg-amber-400", label: "Ação necessária", icon: Clock },
  disponivel: { color: "text-blue-600", bgColor: "bg-blue-500", label: "Pronta para iniciar", icon: Circle },
  solicitada: { color: "text-amber-600", bgColor: "bg-amber-400", label: "Solicitação registrada", icon: Clock },
  aguardando_proposta: { color: "text-amber-600", bgColor: "bg-amber-400", label: "Proposta em elaboração", icon: Clock },
  proposta_enviada: { color: "text-blue-600", bgColor: "bg-blue-500", label: "Proposta disponível para análise", icon: ArrowRight },
  proposta_aceita: { color: "text-emerald-600", bgColor: "bg-emerald-500", label: "Proposta aprovada", icon: CheckCircle2 },
  agendado: { color: "text-blue-600", bgColor: "bg-blue-500", label: "Data confirmada", icon: CalendarDays },
  cancelado: { color: "text-red-500", bgColor: "bg-red-500", label: "Cancelada", icon: Circle },
  nao_convertido: { color: "text-muted-foreground", bgColor: "bg-muted-foreground/40", label: "Não convertido", icon: Circle },
  pendente: { color: "text-muted-foreground", bgColor: "bg-muted-foreground/40", label: "Aguardando liberação", icon: Circle },
};

function getStatusConfig(status: string) {
  return statusConfig[status] || statusConfig.pendente;
}

export default function JourneyTimeline({ stages }: JourneyTimelineProps) {
  const mergedStages = JOURNEY_STAGES.map((def) => {
    const data = stages.find((s) => s.stage_code === def.code);
    return {
      ...def,
      status: (data?.status || "pendente") as StageStatus,
      scheduled_date: data?.scheduled_date || null,
    };
  });

  return (
    <div className="w-full">
      {/* Desktop horizontal */}
      <div className="hidden lg:block overflow-x-auto pb-2">
        <div className="flex items-start gap-0 min-w-[900px]">
          {mergedStages.map((stage, i) => {
            const cfg = getStatusConfig(stage.status);
            const Icon = cfg.icon;
            const isLast = i === mergedStages.length - 1;

            return (
              <div key={stage.code} className="flex items-start flex-1">
                <div className="flex flex-col items-center text-center w-full">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      stage.status === "concluida" || stage.status === "proposta_aceita"
                        ? "bg-emerald-500 text-white"
                        : stage.status === "pendente"
                        ? "bg-muted border-2 border-border text-muted-foreground"
                        : stage.status.includes("aguardando") || stage.status === "solicitada"
                        ? "bg-amber-100 border-2 border-amber-400 text-amber-600"
                        : "bg-blue-100 border-2 border-blue-500 text-blue-600"
                    } transition-all`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground mt-2 max-w-[110px] leading-tight">
                    {stage.name}
                  </p>
                  <span className={`text-[10px] font-medium mt-0.5 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {stage.scheduled_date && (
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(stage.scheduled_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                {!isLast && (
                  <div className="flex items-center mt-5 px-0">
                    <div
                      className={`h-0.5 w-full min-w-[20px] ${
                        stage.status === "concluida" || stage.status === "proposta_aceita"
                          ? "bg-emerald-400"
                          : "bg-border"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile vertical */}
      <div className="lg:hidden space-y-0">
        {mergedStages.map((stage, i) => {
          const cfg = getStatusConfig(stage.status);
          const Icon = cfg.icon;
          const isLast = i === mergedStages.length - 1;

          return (
            <div key={stage.code} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    stage.status === "concluida" || stage.status === "proposta_aceita"
                      ? "bg-emerald-500 text-white"
                      : stage.status === "pendente"
                      ? "bg-muted border-2 border-border text-muted-foreground"
                      : stage.status.includes("aguardando") || stage.status === "solicitada"
                      ? "bg-amber-100 border-2 border-amber-400 text-amber-600"
                      : "bg-blue-100 border-2 border-blue-500 text-blue-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-[32px] ${
                      stage.status === "concluida" || stage.status === "proposta_aceita"
                        ? "bg-emerald-400"
                        : "bg-border"
                    }`}
                  />
                )}
              </div>
              <div className="pb-6">
                <p className="text-sm font-semibold text-foreground leading-tight">{stage.name}</p>
                <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                {stage.scheduled_date && (
                  <span className="text-xs text-muted-foreground block">
                    {new Date(stage.scheduled_date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
