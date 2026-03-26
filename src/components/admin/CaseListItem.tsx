import { Building2, User, Calendar, ChevronDown, ChevronUp, Download, MoreVertical, Trash2 } from "lucide-react";
import { PipelineBadge } from "@/components/shared/PipelineBadge";
import { CaseAlertBadges } from "@/components/admin/CaseAlertBadges";
import { PipelineStatus } from "@/utils/pipeline";
import { CaseAlert } from "@/utils/caseAlerts";
import { formatCNPJ } from "@/utils/cnpj";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CaseListItemProps {
  evaluation: any;
  pipelineStatus: PipelineStatus;
  currentStage: number;
  alerts: CaseAlert[];
  isExpanded: boolean;
  onToggle: () => void;
  onDownloadPDF: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}

export function CaseListItem({
  evaluation: ev,
  pipelineStatus,
  currentStage,
  alerts,
  isExpanded,
  onToggle,
  onDownloadPDF,
  onDelete,
  children,
}: CaseListItemProps) {
  const { hasPermission } = useAdminAuth();
  const company = ev.companies;
  const evaluator = ev.evaluators;
  const isCompleted = ev.status === "completed";
  const hasDangerAlert = alerts.some((a) => a.severity === "danger");
  const canDelete = hasPermission("delete");
  const canExport = hasPermission("export");

  return (
    <div
      className={`bg-card rounded-lg border overflow-hidden transition-colors ${
        hasDangerAlert ? "border-destructive/40" : "border-border"
      }`}
    >
      <div
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Row 1: company + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground truncate">
                {company?.legal_name || "N/A"}
              </span>
              <PipelineBadge status={pipelineStatus} />
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Etapa {currentStage}
              </span>
              <CaseAlertBadges alerts={alerts} compact />
            </div>

            {/* Row 2: meta */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>CNPJ: {company?.cnpj ? formatCNPJ(company.cnpj) : "N/A"}</span>
              {evaluator && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {evaluator.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(ev.created_at).toLocaleDateString("pt-BR")}
              </span>
              {isCompleted && <span>{ev.total_actions} ação(ões)</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isCompleted && canExport && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadPDF();
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            )}
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir empresa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-5 space-y-5 bg-muted/10">
          {children}
        </div>
      )}
    </div>
  );
}
