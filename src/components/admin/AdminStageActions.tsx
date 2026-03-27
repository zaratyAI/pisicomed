import { useState } from "react";
import { Loader2, CalendarDays, Check, LinkIcon, Clock, AlertTriangle, X, RotateCcw, Undo2, Lock } from "lucide-react";
import { StageData } from "@/components/JourneyTimeline";
import { supabase } from "@/integrations/supabase/client";
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

const ROLLBACK_PASSWORD = "04752752174";

interface AdminStageActionsProps {
  evaluationId: string;
  stages: StageData[];
  quote: any;
  proposalLinkValue: string;
  onProposalLinkChange: (value: string) => void;
  scheduleDateValue: string;
  onScheduleDateChange: (value: string) => void;
  scheduleTimeValue: string;
  onScheduleTimeChange: (value: string) => void;
  contactNameValue: string;
  onContactNameChange: (value: string) => void;
  contactPhoneValue: string;
  onContactPhoneChange: (value: string) => void;
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
  scheduleTimeValue,
  onScheduleTimeChange,
  contactNameValue,
  onContactNameChange,
  contactPhoneValue,
  onContactPhoneChange,
  onRefresh,
}: AdminStageActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    key: string;
    label: string;
    action: (notes: string) => Promise<void>;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [rollbackTarget, setRollbackTarget] = useState<{ stageCode: number; stageName: string } | null>(null);
  const [rollbackPassword, setRollbackPassword] = useState("");
  const [rollbackNotes, setRollbackNotes] = useState("");
  const [rollbackError, setRollbackError] = useState("");

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

  const executeRollback = async () => {
    if (rollbackPassword !== ROLLBACK_PASSWORD) {
      setRollbackError("Senha incorreta");
      return;
    }
    if (!rollbackTarget) return;

    setLoading(`rollback_${rollbackTarget.stageCode}`);
    try {
      const sc = rollbackTarget.stageCode;
      const note = rollbackNotes || `Etapa ${sc} revertida pelo admin`;

      // Reset this stage and all subsequent stages to pendente/disponivel
      for (let i = 8; i >= sc; i--) {
        const stage = stages.find((s) => s.stage_code === i);
        if (stage && stage.status !== "pendente") {
          await supabase.from("journey_stages").update({
            status: i === sc ? "disponivel" : "pendente",
            version: (stage.version || 1) + 1,
            completed_at: null,
            scheduled_date: null,
            updated_at: new Date().toISOString(),
          }).eq("evaluation_id", evaluationId).eq("stage_code", i);
        }
      }

      // Cancel related appointments
      await supabase.from("appointments").update({ status: "cancelado" })
        .eq("evaluation_id", evaluationId)
        .gte("stage_code", sc)
        .eq("status", "agendado");

      // Determine correct pipeline status based on the stage we're rolling back to
      const pipelineMap: Record<number, string> = {
        2: "avaliacao_inicial",
        3: "proposta_aceita",
        4: "agendado",
        5: "em_realizacao",
        6: "em_realizacao",
        7: "em_analise",
      };
      const newPipelineStatus = pipelineMap[sc] || "avaliacao_inicial";

      // Direct update pipeline (bypass transition_safe since we're rolling back)
      await supabase.from("evaluations").update({
        pipeline_status: newPipelineStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", evaluationId);

      // Audit log
      await supabase.from("stage_audit_logs").insert({
        evaluation_id: evaluationId,
        stage_code: sc,
        from_status: "concluida",
        to_status: "disponivel",
        action: `rollback:stage${sc}`,
        changed_by: "admin",
        notes: note,
        origin: "manual",
      });

      await onRefresh();
      toast.success(`Etapa ${sc} revertida com sucesso`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reverter etapa");
    } finally {
      setLoading(null);
      setRollbackTarget(null);
      setRollbackPassword("");
      setRollbackNotes("");
      setRollbackError("");
    }
  };

  const getStage = (code: number) => stages.find((s) => s.stage_code === code);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Ações administrativas</h4>

      {/* Rollback password dialog */}
      {rollbackTarget && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-red-800 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Voltar etapa: {rollbackTarget.stageName}
          </p>
          <p className="text-xs text-red-600">
            Isso irá reverter esta etapa e todas as posteriores. Digite a senha de segurança para confirmar.
          </p>
          <input
            type="password"
            value={rollbackPassword}
            onChange={(e) => { setRollbackPassword(e.target.value); setRollbackError(""); }}
            placeholder="Senha de segurança"
            className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40"
          />
          {rollbackError && <p className="text-xs text-red-600 font-medium">{rollbackError}</p>}
          <textarea
            value={rollbackNotes}
            onChange={(e) => setRollbackNotes(e.target.value)}
            placeholder="Motivo da reversão (opcional)..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none"
          />
          <div className="flex gap-2">
            <ActionButton
              label="Confirmar reversão"
              icon={<Undo2 className="w-3.5 h-3.5" />}
              onClick={executeRollback}
              loading={loading === `rollback_${rollbackTarget.stageCode}`}
              variant="danger"
            />
            <button
              onClick={() => { setRollbackTarget(null); setRollbackPassword(""); setRollbackNotes(""); setRollbackError(""); }}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
        {/* ─── Stage 1: Diagnóstico — Admin Notes ─── */}
        {(() => {
          const stage1 = getStage(1);
          if (!stage1) return null;
          return (
            <StageActionSection title="Etapa 1 — Diagnóstico inicial" stageCode={1}>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Anotações do avaliador Med Work</label>
                <textarea
                  defaultValue={(stage1 as any).admin_notes || ""}
                  onBlur={async (e) => {
                    const val = e.target.value;
                    await supabase.from("journey_stages").update({ admin_notes: val }).eq("evaluation_id", evaluationId).eq("stage_code", 1);
                    toast.success("Anotações salvas");
                  }}
                  placeholder="Observações, anotações, parecer técnico..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
              {stage1.status === "concluida" && renderRollbackButton(1, "Diagnóstico inicial")}
            </StageActionSection>
          );
        })()}

        {/* ─── Stage 2: Proposta ─── */}
        {(() => { const s2 = getStage(2); return s2 ? true : false; })() && (
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

  function renderRollbackButton(stageCode: number, stageName: string) {
    const stage = getStage(stageCode);
    if (!stage || stage.status !== "concluida") return null;
    return (
      <StageActionSection title={`Etapa ${stageCode} — ${stageName}`} stageCode={stageCode}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <Check className="w-3 h-3" /> Concluída
          </span>
          <ActionButton
            label="Voltar etapa"
            icon={<Undo2 className="w-3.5 h-3.5" />}
            onClick={() => setRollbackTarget({ stageCode, stageName })}
            variant="danger"
          />
        </div>
      </StageActionSection>
    );
  }

  function renderSchedulingSection(stageCode: number, title: string) {
    const stage = getStage(stageCode);
    if (!stage || stage.status === "pendente") return null;
    if (stage.status === "concluida") return renderRollbackButton(stageCode, title.replace(/Etapa \d+ — /, ""));

    return (
      <StageActionSection title={title} stageCode={stageCode}>
        {(stage.status === "disponivel" || stage.status === "em_andamento") && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={scheduleDateValue}
                onChange={(e) => onScheduleDateChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
              />
              <input
                type="time"
                value={scheduleTimeValue}
                onChange={(e) => onScheduleTimeChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                placeholder="Horário"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={contactNameValue}
                onChange={(e) => onContactNameChange(e.target.value)}
                placeholder="Nome do contato"
                className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
              />
              <input
                type="text"
                value={contactPhoneValue}
                onChange={(e) => onContactPhoneChange(e.target.value)}
                placeholder="Telefone do contato"
                className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
              />
            </div>
            <ActionButton
              label="Agendar"
              icon={<CalendarDays className="w-3.5 h-3.5" />}
              loading={loading === `schedule_${stageCode}`}
              onClick={() =>
                confirmAndExecute(
                  `schedule_${stageCode}`,
                  `Agendar etapa ${stageCode} para ${scheduleDateValue}${scheduleTimeValue ? ` às ${scheduleTimeValue}` : ""}`,
                  async (notes) => {
                    const fullNotes = [
                      notes,
                      scheduleTimeValue ? `Horário: ${scheduleTimeValue}` : "",
                      contactNameValue ? `Contato: ${contactNameValue}` : "",
                      contactPhoneValue ? `Telefone: ${contactPhoneValue}` : "",
                    ].filter(Boolean).join(" | ");
                    await handleScheduleAppointment(evaluationId, stageCode, scheduleDateValue, "admin", fullNotes || undefined);
                    // Save extra fields directly to appointment
                    if (scheduleTimeValue || contactNameValue || contactPhoneValue) {
                      await supabase.from("appointments").update({
                        scheduled_time: scheduleTimeValue || null,
                        contact_name: contactNameValue || null,
                        contact_phone: contactPhoneValue || null,
                      }).eq("evaluation_id", evaluationId).eq("stage_code", stageCode).eq("status", "agendado");
                    }
                  }
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
                {(stage as any).scheduled_time ? ` às ${(stage as any).scheduled_time}` : ""}
              </span>
            )}
            {(stage as any).contact_name && (
              <span className="text-xs text-muted-foreground">
                | Contato: {(stage as any).contact_name} {(stage as any).contact_phone ? `(${(stage as any).contact_phone})` : ""}
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
    if (!stage || stage.status === "pendente") return null;
    if (stage.status === "concluida") return renderRollbackButton(stageCode, title.replace(/Etapa \d+ — /, ""));

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
    if (!stage || stage.status === "pendente") return null;
    if (stage.status === "concluida") return renderRollbackButton(stageCode, title.replace(/Etapa \d+ — /, ""));

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
