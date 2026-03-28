import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { getEvaluationsPaginated, PaginatedResult } from "@/utils/database";
import { PipelineStatus } from "@/utils/pipeline";
import { useDebounce } from "@/hooks/useDebounce";
import { getCaseAlerts, getNextAction, CaseAlert } from "@/utils/caseAlerts";
import JourneyTimeline, { StageData } from "@/components/JourneyTimeline";
import { AdminStageActions } from "@/components/admin/AdminStageActions";
import { AuditLogPanel } from "@/components/admin/AuditLogPanel";
import { NextActionBanner } from "@/components/admin/NextActionBanner";
import { CaseListItem } from "@/components/admin/CaseListItem";
import { DashboardFilters, FilterState } from "@/components/admin/DashboardFilters";
import { DashboardStats } from "@/components/admin/DashboardStats";
import logo from "@/assets/logo-medwork.png";
import { LogOut, Loader2, FileText, Settings2, Trash2, BarChart3, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCNPJ } from "@/utils/cnpj";
import { exportActionPlanPDF } from "@/utils/pdfExport";
import { sendAdminReport } from "@/utils/pipeline";

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { logout, hasPermission, profile, roles } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 50;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [journeyMap, setJourneyMap] = useState<Record<string, StageData[]>>({});
  const [quoteMap, setQuoteMap] = useState<Record<string, any>>({});
  const [scheduleDate, setScheduleDate] = useState<Record<string, string>>({});
  const [scheduleTime, setScheduleTime] = useState<Record<string, string>>({});
  const [contactName, setContactName] = useState<Record<string, string>>({});
  const [contactPhone, setContactPhone] = useState<Record<string, string>>({});
  const [proposalLinks, setProposalLinks] = useState<Record<string, string>>({});
  const [emailModal, setEmailModal] = useState<{ open: boolean; evalId: string; companyName: string }>({ open: false, evalId: "", companyName: "" });
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    stageFilter: "",
    pipelineFilter: "",
    alertFilter: "",
  });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    evalId: string;
    companyName: string;
  }>({ open: false, evalId: "", companyName: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounce search for server-side filtering
  const debouncedSearch = useDebounce(filters.search, 400);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getEvaluationsPaginated({
        limit: PAGE_SIZE,
        offset: currentPage * PAGE_SIZE,
        pipelineStatus: filters.pipelineFilter || undefined,
        search: debouncedSearch || undefined,
      });

      // Normalize RPC shape (company/evaluator) to match component expectations (companies/evaluators)
      const normalizedData = result.data.map((ev: any) => ({
        ...ev,
        companies: ev.company || ev.companies,
        evaluators: ev.evaluator || ev.evaluators,
        company_id: ev.company?.id || ev.company_id,
      }));
      setEvaluations(normalizedData);
      setTotalCount(result.total);

      const evalIds = result.data.map((ev: any) => ev.id);
      if (evalIds.length > 0) {
        const [{ data: stages }, { data: quotes }, { data: appointments }] = await Promise.all([
          supabase
            .from("journey_stages")
            .select("*")
            .in("evaluation_id", evalIds)
            .order("stage_code", { ascending: true }),
          supabase
            .from("quote_requests")
            .select("*")
            .in("evaluation_id", evalIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("appointments")
            .select("*")
            .in("evaluation_id", evalIds)
            .eq("status", "agendado")
            .order("created_at", { ascending: false }),
        ]);

        // Index appointments by eval+stage
        const apptMap: Record<string, any> = {};
        (appointments || []).forEach((a: any) => {
          const key = `${a.evaluation_id}_${a.stage_code}`;
          if (!apptMap[key]) apptMap[key] = a;
        });

        const map: Record<string, StageData[]> = {};
        (stages || []).forEach((s: any) => {
          if (!map[s.evaluation_id]) map[s.evaluation_id] = [];
          const appt = apptMap[`${s.evaluation_id}_${s.stage_code}`];
          map[s.evaluation_id].push({
            stage_code: s.stage_code,
            stage_name: s.stage_name,
            status: s.status,
            scheduled_date: s.scheduled_date,
            // Extra fields for display
            ...(s.admin_notes ? { admin_notes: s.admin_notes } : {}),
            ...(s.version ? { version: s.version } : {}),
            ...(appt?.scheduled_time ? { scheduled_time: appt.scheduled_time } : {}),
            ...(appt?.contact_name ? { contact_name: appt.contact_name } : {}),
            ...(appt?.contact_phone ? { contact_phone: appt.contact_phone } : {}),
          } as any);
        });
        setJourneyMap(map);

        const qMap: Record<string, any> = {};
        (quotes || []).forEach((q: any) => {
          if (!qMap[q.evaluation_id]) qMap[q.evaluation_id] = q;
        });
        setQuoteMap(qMap);
      } else {
        setJourneyMap({});
        setQuoteMap({});
      }
    } catch (err) {
      console.error("Error loading evaluations:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters.pipelineFilter, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [filters.pipelineFilter, debouncedSearch]);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  // ─── Alerts map ───
  const alertsMap = useMemo(() => {
    const map: Record<string, CaseAlert[]> = {};
    evaluations.forEach((ev) => {
      const ps = (ev.pipeline_status || "avaliacao_inicial") as PipelineStatus;
      map[ev.id] = getCaseAlerts(ps, journeyMap[ev.id] || [], ev.created_at, quoteMap[ev.id]);
    });
    return map;
  }, [evaluations, journeyMap, quoteMap]);

  // ─── Current stage helper ───
  const getCurrentStage = (evalId: string): number => {
    const stages = journeyMap[evalId] || [];
    for (let i = stages.length - 1; i >= 0; i--) {
      if (stages[i].status === "concluida") return stages[i].stage_code + 1;
      if (stages[i].status !== "pendente") return stages[i].stage_code;
    }
    return 1;
  };

  // ─── Client-side filtering (stage/alert only — search & pipeline are server-side) ───
  const filtered = useMemo(() => {
    return evaluations.filter((ev) => {
      if (filters.stageFilter) {
        if (String(getCurrentStage(ev.id)) !== filters.stageFilter) return false;
      }

      if (filters.alertFilter) {
        const alerts = alertsMap[ev.id] || [];
        if (!alerts.some((a) => a.type === filters.alertFilter)) return false;
      }

      return true;
    });
  }, [evaluations, filters.stageFilter, filters.alertFilter, journeyMap, alertsMap]);

  // ─── Delete ───
  const openDeleteModal = (ev: any) => {
    setDeleteModal({
      open: true,
      evalId: ev.id,
      companyName: ev.companies?.legal_name || "N/A",
    });
    setDeletePassword("");
    setDeleteError("");
  };

  const handleDeleteCompany = async () => {
    if (deletePassword !== "04752752174") {
      setDeleteError("Senha inválida");
      return;
    }
    setDeleteLoading(true);
    try {
      const ev = evaluations.find((e) => e.id === deleteModal.evalId);
      if (!ev) return;
      const companyId = ev.company_id;

      const { data: companyEvals } = await supabase
        .from("evaluations")
        .select("id")
        .eq("company_id", companyId);
      const evalIds = (companyEvals || []).map((e: any) => e.id);

      if (evalIds.length > 0) {
        await Promise.all([
          supabase.from("action_plans").delete().in("evaluation_id", evalIds),
          supabase.from("answers").delete().in("evaluation_id", evalIds),
          supabase.from("journey_stages").delete().in("evaluation_id", evalIds),
          supabase.from("quote_requests").delete().in("evaluation_id", evalIds),
          supabase.from("appointments").delete().in("evaluation_id", evalIds),
          supabase.from("email_logs").delete().in("evaluation_id", evalIds),
          supabase.from("documents").delete().in("evaluation_id", evalIds),
          supabase.from("stage_audit_logs").delete().in("evaluation_id", evalIds),
        ]);
        await supabase.from("evaluations").delete().eq("company_id", companyId);
      }
      await supabase.from("companies").delete().eq("id", companyId);

      setDeleteModal({ open: false, evalId: "", companyName: "" });
      await loadData();
    } catch (err) {
      console.error("Delete error:", err);
      setDeleteError("Erro ao excluir empresa");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── PDF ───
  const handleDownloadPDF = async (ev: any) => {
    const company = ev.companies;
    const evaluator = ev.evaluators;
    if (!company) return;

    let { data: actions } = await supabase
      .from("action_plans")
      .select("*")
      .eq("evaluation_id", ev.id);

    // Auto-generate action plans if missing (e.g. incomplete evaluation)
    if (!actions || actions.length === 0) {
      const { data: answers } = await supabase
        .from("answers")
        .select("question_code, answer")
        .eq("evaluation_id", ev.id);

      if (answers && answers.length > 0) {
        const { questions } = await import("@/data/questions");
        const { generateActionPlan } = await import("@/utils/actionPlan");
        const answersMap: Record<string, { answer: string }> = {};
        answers.forEach((a: any) => { answersMap[a.question_code] = { answer: a.answer }; });
        const generated = generateActionPlan(questions, answersMap);

        if (generated.length > 0) {
          const items = generated.map((a) => ({
            evaluation_id: ev.id,
            question_code: a.questionCode,
            question_title: a.questionTitle,
            answer: a.answer,
            action_text: a.actionText,
            classification: a.classification,
            priority: a.priority,
            theme: a.theme,
            block: a.block,
          }));
          await supabase.from("action_plans").insert(items);
          await supabase.from("evaluations").update({ total_actions: generated.length }).eq("id", ev.id);
          actions = items;
        }
      }
    }

    const actionItems = (actions || []).map((a: any) => ({
      questionCode: a.question_code,
      questionTitle: a.question_title,
      answer: a.answer,
      actionText: a.action_text,
      classification: a.classification,
      priority: a.priority,
      theme: a.theme,
      block: a.block,
    }));

    const companyData = {
      cnpj: formatCNPJ(company.cnpj),
      legalName: company.legal_name,
      tradeName: company.trade_name || "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      zipCode: company.zip_code || "",
      status: company.status || "",
    };

    const evaluatorData = evaluator
      ? {
          name: evaluator.name,
          cpf: evaluator.cpf,
          email: evaluator.email,
          roleTitle: evaluator.role_title,
        }
      : undefined;

    const date = ev.finished_at
      ? new Date(ev.finished_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    exportActionPlanPDF(companyData, actionItems, date, evaluatorData);
  };

  // ─── Email ───
  const openEmailModal = (ev: any) => {
    const company = ev.companies;
    const evaluator = ev.evaluators;
    setEmailModal({ open: true, evalId: ev.id, companyName: company?.legal_name || "" });
    setEmailTo(evaluator?.email || "");
    setEmailCc("");
    setEmailMessage("");
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) return;
    setEmailSending(true);
    try {
      await sendAdminReport(emailModal.evalId, emailTo, emailCc || undefined, undefined, emailMessage || undefined);
      toast.success(`Email enviado para ${emailTo}`);
      setEmailModal({ open: false, evalId: "", companyName: "" });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar email");
    } finally {
      setEmailSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Med Work" className="h-9 w-auto" />
          <span className="text-sm font-medium text-primary hidden sm:inline">
            Central de Operações
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/analytics")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Gerencial</span>
          </button>
          {profile && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground">{profile.full_name || profile.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{roles[0] || "usuário"}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 lg:px-6 py-6 max-w-7xl mx-auto w-full space-y-5">
        {/* Stats */}
        <DashboardStats evaluations={evaluations} alertsMap={alertsMap} />

        {/* Filters */}
        <DashboardFilters
          filters={filters}
          onChange={setFilters}
          totalCount={totalCount}
          filteredCount={filtered.length}
        />

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filters.search || filters.stageFilter || filters.pipelineFilter || filters.alertFilter
                ? "Nenhuma avaliação encontrada com esses filtros."
                : "Nenhuma avaliação registrada ainda."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ev) => {
              const stages = journeyMap[ev.id] || [];
              const quote = quoteMap[ev.id];
              const pipelineStatus = (ev.pipeline_status ||
                "avaliacao_inicial") as PipelineStatus;
              const currentStage = getCurrentStage(ev.id);
              const alerts = alertsMap[ev.id] || [];
              const nextAction = getNextAction(pipelineStatus, stages, quote);

              return (
                <CaseListItem
                  key={ev.id}
                  evaluation={ev}
                  pipelineStatus={pipelineStatus}
                  currentStage={currentStage}
                  alerts={alerts}
                  isExpanded={expandedId === ev.id}
                  onToggle={() =>
                    setExpandedId(expandedId === ev.id ? null : ev.id)
                  }
                  onDownloadPDF={() => handleDownloadPDF(ev)}
                  onSendEmail={() => openEmailModal(ev)}
                  onDelete={() => openDeleteModal(ev)}
                >
                  {/* Next action banner */}
                  <NextActionBanner action={nextAction} />

                  {/* Case alerts (full labels) */}
                  {alerts.length > 0 && (
                    <div className="space-y-1">
                      {alerts.map((a, i) => (
                        <div
                          key={i}
                          className={`text-xs px-3 py-1.5 rounded-lg ${
                            a.severity === "danger"
                              ? "bg-destructive/10 text-destructive"
                              : a.severity === "warning"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-primary/5 text-primary"
                          }`}
                        >
                          {a.label}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Journey timeline */}
                  {stages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Settings2 className="w-4 h-4" /> Jornada de adequação
                      </h4>
                      <JourneyTimeline stages={stages} />
                    </div>
                  )}

                  {/* Admin actions */}
                  <AdminStageActions
                    evaluationId={ev.id}
                    stages={stages}
                    quote={quote}
                    proposalLinkValue={
                      proposalLinks[ev.id] ??
                      (quote as any)?.proposal_link ??
                      ""
                    }
                    onProposalLinkChange={(val) =>
                      setProposalLinks((p) => ({ ...p, [ev.id]: val }))
                    }
                    scheduleDateValue={scheduleDate[ev.id] || ""}
                    onScheduleDateChange={(val) =>
                      setScheduleDate((p) => ({ ...p, [ev.id]: val }))
                    }
                    scheduleTimeValue={scheduleTime[ev.id] || ""}
                    onScheduleTimeChange={(val) =>
                      setScheduleTime((p) => ({ ...p, [ev.id]: val }))
                    }
                    contactNameValue={contactName[ev.id] || ""}
                    onContactNameChange={(val) =>
                      setContactName((p) => ({ ...p, [ev.id]: val }))
                    }
                    contactPhoneValue={contactPhone[ev.id] || ""}
                    onContactPhoneChange={(val) =>
                      setContactPhone((p) => ({ ...p, [ev.id]: val }))
                    }
                    onRefresh={loadData}
                  />

                  {/* Audit log */}
                  <AuditLogPanel
                    evaluationId={ev.id}
                    currentPipelineStatus={ev.pipeline_status || "avaliacao_inicial"}
                  />
                </CaseListItem>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Página {currentPage + 1} de {Math.ceil(totalCount / PAGE_SIZE)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={(currentPage + 1) * PAGE_SIZE >= totalCount}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Email modal */}
      <Dialog
        open={emailModal.open}
        onOpenChange={(open) => {
          if (!open) setEmailModal({ open: false, evalId: "", companyName: "" });
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar relatório por email</DialogTitle>
            <DialogDescription>
              {emailModal.companyName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Para (email principal)</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="email@empresa.com"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">CC (opcional, separar por vírgula)</label>
              <input
                type="text"
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
                placeholder="copia1@empresa.com, copia2@empresa.com"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Mensagem personalizada (opcional)</label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Prezado(a), segue o relatório de diagnóstico..."
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O email incluirá o relatório completo com plano de ação e aviso de resguardo jurídico, enviado de psicossociais@medwork-to.com.br
            </p>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setEmailModal({ open: false, evalId: "", companyName: "" })}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendEmail}
              disabled={emailSending || !emailTo.trim()}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar relatório
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete modal */}
      <Dialog
        open={deleteModal.open}
        onOpenChange={(open) => {
          if (!open)
            setDeleteModal({ open: false, evalId: "", companyName: "" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmação de exclusão</DialogTitle>
            <DialogDescription className="text-destructive font-medium">
              Essa ação é irreversível
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Empresa:{" "}
              <span className="font-semibold text-foreground">
                {deleteModal.companyName}
              </span>
            </p>
            <div>
              <label className="text-sm font-medium text-foreground">
                Digite a senha de autorização
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeleteError("");
                }}
                placeholder="Senha de autorização"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {deleteError && (
                <p className="text-xs text-destructive mt-1">{deleteError}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() =>
                setDeleteModal({ open: false, evalId: "", companyName: "" })
              }
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteCompany}
              disabled={deleteLoading || !deletePassword}
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {deleteLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Sim, excluir empresa
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboardPage;
