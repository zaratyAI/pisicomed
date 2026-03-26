import { BarChart3, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { PipelineStatus } from "@/utils/pipeline";
import { CaseAlert } from "@/utils/caseAlerts";

interface DashboardStatsProps {
  evaluations: any[];
  alertsMap: Record<string, CaseAlert[]>;
}

export function DashboardStats({ evaluations, alertsMap }: DashboardStatsProps) {
  const total = evaluations.length;
  const finalized = evaluations.filter(
    (ev) => ev.pipeline_status === "finalizado"
  ).length;
  const overdueCount = Object.values(alertsMap).filter((alerts) =>
    alerts.some((a) => a.type === "overdue")
  ).length;
  const stalledCount = Object.values(alertsMap).filter((alerts) =>
    alerts.some((a) => a.type === "stalled")
  ).length;

  const stats = [
    {
      label: "Casos em operação",
      value: total,
      icon: <BarChart3 className="w-4 h-4" />,
      color: "text-primary",
      bg: "bg-primary/5",
    },
    {
      label: "Processos concluídos",
      value: finalized,
      icon: <CheckCircle className="w-4 h-4" />,
      color: "text-secondary",
      bg: "bg-secondary/5",
    },
    {
      label: "Agendamentos atrasados",
      value: overdueCount,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-destructive",
      bg: "bg-destructive/5",
    },
    {
      label: "Sem movimentação",
      value: stalledCount,
      icon: <Clock className="w-4 h-4" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`${s.bg} rounded-lg border border-border p-3 flex items-center gap-3`}
        >
          <div className={s.color}>{s.icon}</div>
          <div>
            <p className="text-lg font-bold text-foreground leading-tight">
              {s.value}
            </p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
