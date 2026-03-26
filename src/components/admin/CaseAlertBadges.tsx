import { AlertTriangle, Clock, CalendarDays, CircleAlert } from "lucide-react";
import { CaseAlert } from "@/utils/caseAlerts";

const ALERT_CONFIG: Record<
  CaseAlert["type"],
  { icon: React.ElementType; color: string }
> = {
  overdue: { icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
  stalled: { icon: Clock, color: "text-amber-600 bg-amber-50" },
  upcoming: { icon: CalendarDays, color: "text-primary bg-primary/10" },
  no_action: { icon: CircleAlert, color: "text-muted-foreground bg-muted" },
};

interface CaseAlertBadgesProps {
  alerts: CaseAlert[];
  compact?: boolean;
}

export function CaseAlertBadges({ alerts, compact }: CaseAlertBadgesProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {alerts.map((alert, i) => {
        const config = ALERT_CONFIG[alert.type];
        const Icon = config.icon;
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.color}`}
            title={alert.label}
          >
            <Icon className="w-3 h-3" />
            {!compact && alert.label}
          </span>
        );
      })}
    </div>
  );
}
