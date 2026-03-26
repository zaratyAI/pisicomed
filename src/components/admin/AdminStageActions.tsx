import { useState } from "react";
import { Loader2, CalendarDays, Check, LinkIcon, Clock, AlertTriangle, X, RotateCcw } from "lucide-react";
import { StageData } from "@/components/JourneyTimeline";
import {
  handleProposalSent,
  handleProposalAccepted,
  handleProposalRejected,
  handleProposalAdjustment,
  handleProposalReopen,
  handleScheduleAppointment,
  handleReschedule,
  handleStageRealized,
  handleStageCompleted,
} from "@/utils/pipeline";
import { toast } from "sonner";

interface AdminStageActionsProps {
  evaluationId: string;
  stages: StageData[];
  quote: any;
  proposalLinkValue: string;
  onProposalLinkChange: (value: string) => void;
  scheduleDateValue: string;
  onScheduleDateChange: (value: string) => void;
  onRefresh: () => Promise<void>;
}

function ActionButton({
  label,
  icon,
  onClick,
  loading,
  disabled,
  variant = "default",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "success" | "danger";
}) {
  const base =
    "flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none";
  const variants = {
    default: "bg-primary text-primary-foreground hover:brightness-110",
    success: "bg-emerald-500 text-white hover:bg-emerald-600",
    danger: "bg-destructive text-destructive-foreground hover:brightness-110",
  };

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]}`}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

export function AdminStageActions({
  evaluationId,
  stages,
  quote,
  proposalLinkValue,
  onProposalLinkChange,
  scheduleDateValue,
  onScheduleDateChange,
  onRefresh,
}: AdminStageActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    key: string;
    label: string;
    action: (notes: string) => Promise<void>;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const withLoading = async (key: string, action: () => Promise<void>) => {
    setLoading(key);
    try {
      await action();
      await onRefresh();
      toast.success("Ação realizada com sucesso");
    } catch (err: any) {
      console.error("Stage action error:", err);
      toast.error(err?.message || "Erro ao executar ação");
    } finally {
      setLoading(null);
      setConfirmAction(null);
      setActionNotes("");
    }
  };

  const confirmAndExecute = (
    key: string,
    label: string,
    action: (notes: string) => Promise<void>
  ) => {
    setConfirmAction({ key, label, action });
    setActionNotes("");
  };

  const getStage = (code: number) => stages.find((s) => s.stage_code === code);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Ações administrativas</h4>

      {/* Confirmation dialog with notes */}
      {confirmAction && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Confirmar: {confirmAction.label}?
          </p>
          <textarea
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            placeholder="Observação ou motivo (opcional)..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
          />
          <div className="flex gap-2">
            <ActionButton
              label="Confirmar"
              icon={<Check className="w-3.5 h-3.5" />}
              onClick={() =>
                withLoading(confirmAction.key, () => confirmAction.action(actionNotes))
              }
              loading={loading === confirmAction.key}
              variant="success"
            />
            <button
              onClick={() => {
                setConfirmAction(null);
                setActionNotes("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {/* ─── Stage 2: Proposta ─── */}
        {quote && (
          <StageActionSection title="Etapa 2 — Orçamento e Proposta" stageCode={2}>
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="Cole o link da proposta aqui..."
                value={proposalLinkValue}
                onChange={(e) => onProposalLinkChange(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <ActionButton
                label="Salvar proposta"
                icon={<LinkIcon className="w-3.5 h-3.5" />}
                loading={loading === "proposal_send"}
                onClick={() =>
                  confirmAndExecute("proposal_send", "Enviar proposta ao cliente", (notes) =>
                    handleProposalSent(evaluationId, proposalLinkValue, "admin", notes || undefined)
                  )
                }
                disabled={!proposalLinkValue}
              />
            </div>

            {(quote as any).proposal_link && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                {quote.proposal_status !== "approved" && quote.proposal_status !== "rejected" && (
                  <>
                    <ActionButton
                      label="Proposta aceita"
                      icon={<Check className="w-3.5 h-3.5" />}
                      loading={loading === "proposal_accept"}
                      onClick={() =>
                        confirmAndExecute("proposal_accept", "Marcar proposta como ACEITA", (notes) =>
                          handleProposalAccepted(evaluationId, "admin", notes || undefined)
                        )
                      }
                      variant="success"
                    />
                    <ActionButton
                      label="Solicitar ajuste"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      loading={loading === "proposal_adjustment"}
                      onClick={() =>
                        confirmAndExecute("proposal_adjustment", "Solicitar AJUSTE na proposta", (notes) =>
                          handleProposalAdjustment(evaluationId, "admin", notes || undefined)
                        )
                      }
                    />
                    <ActionButton
                      label="Proposta recusada"
                      icon={<X className="w-3.5 h-3.5" />}
                      loading={loading === "proposal_reject"}
                      onClick={() =>
                        confirmAndExecute("proposal_reject", "Marcar proposta como RECUSADA", (notes) =>
                          handleProposalRejected(evaluationId, "admin", notes || undefined)
                        )
                      }
                      variant="danger"
                    />
                  </>
                )}
                {quote.proposal_status === "approved" && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Aceita
                  </span>
                )}
                {quote.proposal_status === "rejected" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive font-medium flex items-center gap-1">
                      <X className="w-3 h-3" /> Recusada
                    </span>
                    <ActionButton
                      label="Reabrir proposta"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      loading={loading === "proposal_reopen"}
                      onClick={() =>
                        confirmAndExecute("proposal_reopen", "Reabrir proposta para renegociação", (notes) =>
                          handleProposalReopen(evaluationId, "admin", notes || undefined)
                        )
                      }
                    />
                  </div>
                )}
                {quote.proposal_status === "adjustment_requested" && (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Ajuste solicitado
                  </span>
                )}
              </div>
            )}
          </StageActionSection>
        )}

        {/* ─── Stage 3: Agendamento ─── */}
        {renderSchedulingSection(3, "Etapa 3 — Agendamento da avaliação")}

        {/* ─── Stage 4: Avaliação presencial/online ─── */}
        {renderRealizationSection(4, "Etapa 4 — Avaliação presencial ou online")}

        {/* ─── Stage 5: Questionário ─── */}
        {renderSchedulingSection(5, "Etapa 5 — Questionário com funcionários")}

        {/* ─── Stage 6: Análise ─── */}
        {renderCompletionSection(6, "Etapa 6 — Análise dos resultados")}

        {/* ─── Stage 7: PGR ─── */}
        {renderCompletionSection(7, "Etapa 7 — Atualização do PGR")}
      </div>
    </div>
  );

  function renderSchedulingSection(stageCode: number, title: string) {
    const stage = getStage(stageCode);
    if (!stage || stage.status === "pendente" || stage.status === "concluida") return null;

    return (
      <StageActionSection title={title} stageCode={stageCode}>
        {(stage.status === "disponivel" || stage.status === "em_andamento") && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={scheduleDateValue}
              onChange={(e) => onScheduleDateChange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
            />
            <ActionButton
              label="Agendar"
              icon={<CalendarDays className="w-3.5 h-3.5" />}
              loading={loading === `schedule_${stageCode}`}
              onClick={() =>
                confirmAndExecute(
                  `schedule_${stageCode}`,
                  `Agendar etapa ${stageCode} para ${scheduleDateValue}`,
                  (notes) =>
                    handleScheduleAppointment(
                      evaluationId,
                      stageCode,
                      scheduleDateValue,
                      "admin",
                      notes || undefined
                    )
                )
              }
              disabled={!scheduleDateValue}
            />
          </div>
        )}
        {stage.status === "agendado" && (
          <div className="flex items-center gap-2 flex-wrap">
            {stage.scheduled_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Agendado: {new Date(stage.scheduled_date + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
            )}
            <ActionButton
              label="Marcar como realizado"
              icon={<Check className="w-3.5 h-3.5" />}
              loading={loading === `realize_${stageCode}`}
              onClick={() =>
                confirmAndExecute(
                  `realize_${stageCode}`,
                  `Marcar etapa ${stageCode} como REALIZADA`,
                  (notes) => handleStageRealized(evaluationId, stageCode, "admin", notes || undefined)
                )
              }
              variant="success"
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={scheduleDateValue}
                onChange={(e) => onScheduleDateChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-sm"
              />
              <ActionButton
                label="Reagendar"
                icon={<CalendarDays className="w-3.5 h-3.5" />}
                loading={loading === `reschedule_${stageCode}`}
                onClick={() =>
                  confirmAndExecute(
                    `reschedule_${stageCode}`,
                    `Reagendar etapa ${stageCode}`,
                    (notes) =>
                      handleReschedule(
                        evaluationId,
                        stageCode,
                        scheduleDateValue,
                        "admin",
                        notes || undefined
                      )
                  )
                }
                disabled={!scheduleDateValue}
              />
            </div>
          </div>
        )}
        {stage.status === "realizado" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Realizado
            </span>
            <ActionButton
              label="Concluir etapa"
              icon={<Check className="w-3.5 h-3.5" />}
              loading={loading === `complete_${stageCode}`}
              onClick={() =>
                confirmAndExecute(
                  `complete_${stageCode}`,
                  `Concluir etapa ${stageCode}`,
                  (notes) => handleStageCompleted(evaluationId, stageCode, "admin", notes || undefined)
                )
              }
              variant="success"
            />
          </div>
        )}
      </StageActionSection>
    );
  }

  function renderRealizationSection(stageCode: number, title: string) {
    const stage = getStage(stageCode);
    if (!stage || stage.status === "pendente" || stage.status === "concluida") return null;

    return (
      <StageActionSection title={title} stageCode={stageCode}>
        {stage.status === "disponivel" && (
          <ActionButton
            label="Marcar como realizado"
            icon={<Check className="w-3.5 h-3.5" />}
            loading={loading === `realize_${stageCode}`}
            onClick={() =>
              confirmAndExecute(
                `realize_${stageCode}`,
                `Marcar etapa ${stageCode} como REALIZADA`,
                (notes) => handleStageRealized(evaluationId, stageCode, "admin", notes || undefined)
              )
            }
            variant="success"
          />
        )}
        {stage.status === "realizado" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Realizado
            </span>
            <ActionButton
              label="Concluir etapa"
              icon={<Check className="w-3.5 h-3.5" />}
              loading={loading === `complete_${stageCode}`}
              onClick={() =>
                confirmAndExecute(
                  `complete_${stageCode}`,
                  `Concluir etapa ${stageCode}`,
                  (notes) => handleStageCompleted(evaluationId, stageCode, "admin", notes || undefined)
                )
              }
              variant="success"
            />
          </div>
        )}
      </StageActionSection>
    );
  }

  function renderCompletionSection(stageCode: number, title: string) {
    const stage = getStage(stageCode);
    if (!stage || stage.status === "pendente" || stage.status === "concluida") return null;

    return (
      <StageActionSection title={title} stageCode={stageCode}>
        <ActionButton
          label="Concluir etapa"
          icon={<Check className="w-3.5 h-3.5" />}
          loading={loading === `complete_${stageCode}`}
          onClick={() =>
            confirmAndExecute(
              `complete_${stageCode}`,
              `Concluir etapa ${stageCode}`,
              (notes) => handleStageCompleted(evaluationId, stageCode, "admin", notes || undefined)
            )
          }
          variant="success"
        />
      </StageActionSection>
    );
  }
}

function StageActionSection({
  title,
  stageCode,
  children,
}: {
  title: string;
  stageCode: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
