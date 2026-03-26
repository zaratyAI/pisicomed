import { useState, useEffect } from "react";
import { getAuditHistory } from "@/utils/pipeline";
import { JOURNEY_STAGES } from "@/data/journeyStages";
import { STAGE_STATUS_LABELS, StageStatus } from "@/data/journeyStages";
import { PIPELINE_LABELS, PipelineStatus } from "@/utils/pipeline";
import {
  Clock, ChevronDown, ChevronUp, User, Zap, Monitor,
  MessageSquare, Shield, FileCheck, AlertCircle, CheckCircle2,
} from "lucide-react";

interface AuditLogPanelProps {
  evaluationId: string;
  currentPipelineStatus?: string;
  latestStageStatuses?: Record<number, string>;
}

interface AuditEntry {
  id: string;
  stage_code: number | null;
  from_status: string | null;
  to_status: string;
  action: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
  origin?: string;
}

const ORIGIN_CONFIG: Record<string, { label: string; icon: typeof User; className: string }> = {
  manual: { label: "Operador", icon: User, className: "bg-blue-100 text-blue-700" },
  automatico: { label: "Automático", icon: Zap, className: "bg-amber-100 text-amber-700" },
  sistema: { label: "Sistema", icon: Monitor, className: "bg-muted text-muted-foreground" },
};

function getStageName(code: number | null): string {
  if (!code) return "";
  const stage = JOURNEY_STAGES.find((s) => s.code === code);
  return stage ? stage.name : `Etapa ${code}`;
}

function getStatusLabel(status: string): string {
  return STAGE_STATUS_LABELS[status as StageStatus] || PIPELINE_LABELS[status as PipelineStatus] || status;
}

function formatAction(action: string): { label: string; category: "stage" | "pipeline" | "system" } {
  // Auto-unlock
  if (action.includes("auto-unlock")) {
    const match = action.match(/stage(\d+)/);
    const stageName = match ? getStageName(Number(match[1])) : "";
    return { label: `Liberação automática: ${stageName}`, category: "system" };
  }

  // Proposal actions
  if (action.includes("proposal_sent")) return { label: "Proposta comercial enviada ao cliente", category: "pipeline" };
  if (action.includes("proposal_accepted")) return { label: "Proposta aprovada pelo cliente", category: "pipeline" };
  if (action.includes("cancelamento")) return { label: "Processo cancelado", category: "pipeline" };
  if (action.includes("reagendamento")) return { label: "Reagendamento solicitado", category: "stage" };

  // Stage transitions: "stage3:disponivel→agendado"
  const stageMatch = action.match(/stage(\d+):(.+)→(.+)/);
  if (stageMatch) {
    const stageName = getStageName(Number(stageMatch[1]));
    const from = getStatusLabel(stageMatch[2]);
    const to = getStatusLabel(stageMatch[3]);
    return { label: `${stageName}: ${from} → ${to}`, category: "stage" };
  }

  // Pipeline transitions: "pipeline:proposta_enviada→proposta_aceita"
  const pipeMatch = action.match(/pipeline:(.+)→(.+)/);
  if (pipeMatch) {
    const from = getStatusLabel(pipeMatch[1]);
    const to = getStatusLabel(pipeMatch[2]);
    return { label: `${from} → ${to}`, category: "pipeline" };
  }

  return { label: action, category: "system" };
}

const CATEGORY_STYLES = {
  stage: { icon: FileCheck, color: "text-primary", dot: "bg-primary" },
  pipeline: { icon: Shield, color: "text-secondary", dot: "bg-secondary" },
  system: { icon: Monitor, color: "text-muted-foreground", dot: "bg-muted-foreground" },
};

export function AuditLogPanel({ evaluationId, currentPipelineStatus, latestStageStatuses }: AuditLogPanelProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    getAuditHistory(evaluationId)
      .then((data) => setEntries(data as AuditEntry[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [evaluationId, expanded]);

  // Consistency check: verify latest audit entry matches current pipeline status
  const consistencyOk = (() => {
    if (!currentPipelineStatus || entries.length === 0) return null;
    const latestPipelineEntry = entries.find((e) => e.action.startsWith("pipeline:"));
    if (!latestPipelineEntry) return null;
    return latestPipelineEntry.to_status === currentPipelineStatus;
  })();

  return (
    <div className="border-t border-border pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Clock className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">
          Histórico de rastreabilidade
          {entries.length > 0 && (
            <span className="text-muted-foreground/60 ml-1">({entries.length} registros)</span>
          )}
        </span>
        {consistencyOk === true && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Consistente
          </span>
        )}
        {consistencyOk === false && (
          <span className="flex items-center gap-1 text-[10px] text-destructive font-medium">
            <AlertCircle className="w-3 h-3" /> Inconsistência detectada
          </span>
        )}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Summary bar */}
          {entries.length > 0 && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <span>
                <strong className="text-foreground">{entries.length}</strong> eventos registrados
              </span>
              <span>·</span>
              <span>
                Primeiro: {new Date(entries[entries.length - 1]?.created_at).toLocaleDateString("pt-BR")}
              </span>
              <span>·</span>
              <span>
                Último: {new Date(entries[0]?.created_at).toLocaleDateString("pt-BR")}
              </span>
              <span>·</span>
              <span>
                {entries.filter((e) => e.origin === "manual").length} manuais,{" "}
                {entries.filter((e) => e.origin === "automatico" || e.origin === "sistema").length} automáticos
              </span>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Carregando histórico...</p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhum registro de rastreabilidade ainda.
              </p>
            ) : (
              <div className="relative pl-4 border-l-2 border-border space-y-0">
                {entries.map((entry) => {
                  const originCfg = ORIGIN_CONFIG[entry.origin || "manual"] || ORIGIN_CONFIG.manual;
                  const OriginIcon = originCfg.icon;
                  const { label: actionLabel, category } = formatAction(entry.action);
                  const catStyle = CATEGORY_STYLES[category];
                  const CatIcon = catStyle.icon;

                  return (
                    <div key={entry.id} className="relative pb-4 last:pb-0">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[calc(0.25rem+1px)] top-1 w-2 h-2 rounded-full ${catStyle.dot} ring-2 ring-background`} />

                      <div className="ml-3 space-y-1">
                        {/* Header: date + origin + responsible */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                            {new Date(entry.created_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${originCfg.className}`}
                          >
                            <OriginIcon className="w-2.5 h-2.5" />
                            {originCfg.label}
                          </span>
                          {entry.changed_by && entry.changed_by !== "sistema" && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <User className="w-2.5 h-2.5" />
                              {entry.changed_by}
                            </span>
                          )}
                        </div>

                        {/* Action with category icon */}
                        <div className="flex items-start gap-1.5">
                          <CatIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${catStyle.color}`} />
                          <p className="text-xs font-medium text-foreground leading-snug">
                            {actionLabel}
                          </p>
                        </div>

                        {/* Stage context */}
                        {entry.stage_code && (
                          <p className="text-[10px] text-muted-foreground ml-5">
                            {getStageName(entry.stage_code)}
                          </p>
                        )}

                        {/* Notes */}
                        {entry.notes && (
                          <div className="flex items-start gap-1.5 ml-5 mt-0.5 bg-muted/40 rounded px-2 py-1">
                            <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                            <p className="text-[11px] text-muted-foreground italic leading-snug">
                              {entry.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
