import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEvaluation } from "@/contexts/EvaluationContext";
import { exportActionPlanPDF } from "@/utils/pdfExport";
import { formatCPF } from "@/utils/cpf";
import { formatCNPJ } from "@/utils/cnpj";
import { supabase } from "@/integrations/supabase/client";
import { CompanyData } from "@/utils/cnpj";
import { ActionItem } from "@/utils/actionPlan";
import { EvaluatorData } from "@/utils/database";
import { getJourneyStages, requestQuote, getQuoteRequest } from "@/utils/journey";
import JourneyTimeline, { StageData } from "@/components/JourneyTimeline";
import logo from "@/assets/logo-medwork.png";
import {
  Download, Printer, RotateCcw, AlertTriangle, CheckCircle2,
  Shield, User, Building2, Calendar, Loader2, Send, ArrowRight, FileText,
} from "lucide-react";

const classificationColors: Record<string, string> = {
  "Obrigatória": "bg-primary text-primary-foreground",
  "Indispensável": "bg-secondary text-secondary-foreground",
  "Recomendada": "bg-muted text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  Alta: "text-destructive",
  Média: "text-primary",
  Baixa: "text-muted-foreground",
};

interface LoadedData {
  company: CompanyData;
  evaluator: EvaluatorData | null;
  actionPlan: ActionItem[];
  evaluationDate: string;
  evaluationId: string;
  companyId: string;
}

const ResultPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const evaluation = useEvaluation();
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [journeyStages, setJourneyStages] = useState<StageData[]>([]);
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [quoteSending, setQuoteSending] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [proposalApproved, setProposalApproved] = useState(false);
  const [proposalLink, setProposalLink] = useState<string | null>(null);
  const [proposalSent, setProposalSent] = useState(false);

  const isFromUrl = !!id;

  useEffect(() => {
    if (!isFromUrl) return;

    const loadFromDb = async () => {
      setLoading(true);
      try {
        const { data: ev, error: evErr } = await supabase
          .from("evaluations")
          .select("*, companies(*), evaluators(*)")
          .eq("id", id)
          .maybeSingle();

        if (evErr || !ev) {
          setError("Avaliação não encontrada.");
          setLoading(false);
          return;
        }

        const comp = ev.companies as any;
        const eval_ = ev.evaluators as any;

        const { data: actions } = await supabase
          .from("action_plans")
          .select("*")
          .eq("evaluation_id", id);

        const company: CompanyData = {
          cnpj: comp?.cnpj || "",
          legalName: comp?.legal_name || "",
          tradeName: comp?.trade_name || "",
          address: comp?.address || "",
          city: comp?.city || "",
          state: comp?.state || "",
          zipCode: comp?.zip_code || "",
          status: comp?.status || "",
        };

        const evaluator: EvaluatorData | null = eval_
          ? { name: eval_.name, cpf: eval_.cpf, email: eval_.email, roleTitle: eval_.role_title }
          : null;

        const actionPlan: ActionItem[] = (actions || []).map((a: any) => ({
          questionCode: a.question_code,
          questionTitle: a.question_title,
          answer: a.answer,
          actionText: a.action_text,
          classification: a.classification,
          priority: a.priority,
          theme: a.theme,
          block: a.block,
        }));

        const date = ev.finished_at
          ? new Date(ev.finished_at).toLocaleString("pt-BR")
          : ev.started_at
          ? new Date(ev.started_at).toLocaleString("pt-BR")
          : new Date(ev.created_at).toLocaleString("pt-BR");

        setLoadedData({
          company,
          evaluator,
          actionPlan,
          evaluationDate: date,
          evaluationId: ev.id,
          companyId: comp?.id || "",
        });
      } catch {
        setError("Erro ao carregar avaliação.");
      } finally {
        setLoading(false);
      }
    };

    loadFromDb();
  }, [id, isFromUrl]);

  // Load journey stages
  const currentEvalId = isFromUrl ? (loadedData?.evaluationId || id) : evaluation.evaluationId;

  useEffect(() => {
    if (!currentEvalId) return;
    loadJourney(currentEvalId);
  }, [currentEvalId]);

  const loadJourney = async (evalId: string) => {
    const stages = await getJourneyStages(evalId);
    setJourneyStages(stages);

    const quote = await getQuoteRequest(evalId);
    if (quote) {
      setQuoteRequested(true);
      if (quote.proposal_status === "approved") {
        setProposalApproved(true);
      }
      if ((quote as any).proposal_link) {
        setProposalLink((quote as any).proposal_link);
        setProposalSent(true);
      }
    }
  };

  const company = isFromUrl ? loadedData?.company : evaluation.company;
  const evaluator = isFromUrl ? loadedData?.evaluator : evaluation.evaluator;
  const actionPlan = isFromUrl ? (loadedData?.actionPlan || []) : evaluation.actionPlan;
  const evaluationDate = isFromUrl
    ? (loadedData?.evaluationDate || "")
    : evaluation.evaluationDate;
  const evalId = isFromUrl ? (loadedData?.evaluationId || id || "") : (evaluation.evaluationId || "");
  const companyId = isFromUrl ? (loadedData?.companyId || "") : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando avaliação...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm text-foreground">{error}</p>
          <button onClick={() => navigate("/")} className="text-primary text-sm underline">
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  if (!company || !actionPlan) {
    navigate("/");
    return null;
  }

  const obrigatorias = actionPlan.filter((a) => a.classification === "Obrigatória");
  const indispensaveis = actionPlan.filter((a) => a.classification === "Indispensável");
  const recomendadas = actionPlan.filter((a) => a.classification === "Recomendada");

  const total = actionPlan.length;
  const pctObrig = total ? Math.round((obrigatorias.length / total) * 100) : 0;
  const pctIndisp = total ? Math.round((indispensaveis.length / total) * 100) : 0;
  const pctRecom = total ? Math.round((recomendadas.length / total) * 100) : 0;

  const handlePDF = () => {
    exportActionPlanPDF(company, actionPlan, evaluationDate, evaluator || undefined);
  };

  const handlePrint = () => window.print();
  const handleNew = () => {
    evaluation.reset();
    navigate("/");
  };

  const handleRequestQuote = async () => {
    if (!evaluator || !evalId) return;
    setQuoteSending(true);

    try {
      // Get company_id from DB if loading from URL, or find it
      let cId = companyId;
      if (!cId && company) {
        const cnpjClean = company.cnpj.replace(/\D/g, "");
        const { data: comp } = await supabase
          .from("companies")
          .select("id")
          .eq("cnpj", cnpjClean)
          .maybeSingle();
        cId = comp?.id || "";
      }

      if (!cId) throw new Error("Company not found");

      await requestQuote({
        companyId: cId,
        evaluationId: evalId,
        requesterName: evaluator.name,
        requesterRole: evaluator.roleTitle,
        requesterCpf: evaluator.cpf,
        requesterEmail: evaluator.email,
      });

      setQuoteRequested(true);
      setQuoteSuccess(true);

      // Reload journey
      await loadJourney(evalId);

      setTimeout(() => setQuoteSuccess(false), 5000);
    } catch (err) {
      console.error("Error requesting quote:", err);
    } finally {
      setQuoteSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3 print:hidden">
        <img src={logo} alt="Med Work" className="h-10 w-auto cursor-pointer" onClick={() => navigate("/avaliador")} />
        <span className="text-sm font-medium text-muted-foreground">Relatório de Diagnóstico Inicial</span>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="animate-reveal-up space-y-8">
          {/* Title */}
          <div className="text-center">
            <img src={logo} alt="Med Work" className="h-16 w-auto mx-auto mb-4 hidden print:block" />
            <h1
              className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
              style={{ lineHeight: "1.2" }}
            >
              Diagnóstico inicial de conformidade — Riscos Psicossociais
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Relatório gerado automaticamente pela plataforma Med Work com base no checklist de conformidade da NR-1.
            </p>
          </div>

          {/* Company & Evaluator Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Empresa</h3>
              </div>
              <div className="text-sm space-y-1">
                <InfoLine label="Razão Social" value={company.legalName} />
                {company.tradeName && <InfoLine label="Nome Fantasia" value={company.tradeName} />}
                <InfoLine label="CNPJ" value={formatCNPJ(company.cnpj)} />
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-5 h-5 text-secondary" />
                <h3 className="font-semibold text-foreground">Avaliador</h3>
              </div>
              <div className="text-sm space-y-1">
                {evaluator ? (
                  <>
                    <InfoLine label="Nome" value={evaluator.name} />
                    <InfoLine label="Função" value={evaluator.roleTitle} />
                    <InfoLine label="CPF" value={formatCPF(evaluator.cpf)} />
                    <InfoLine label="E-mail" value={evaluator.email} />
                  </>
                ) : (
                  <p className="text-muted-foreground">Não informado</p>
                )}
                <InfoLine
                  label="Data"
                  value={evaluationDate}
                  icon={<Calendar className="w-3.5 h-3.5" />}
                />
              </div>
            </div>
          </div>

          {/* BLOCK 1: Dashboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <DashCard label="Total de ações" value={total} pct={null} icon={<Shield className="w-5 h-5" />} colorClass="text-foreground" bgClass="bg-card" />
            <DashCard label="Obrigatórias" value={obrigatorias.length} pct={pctObrig} icon={<AlertTriangle className="w-5 h-5" />} colorClass="text-primary" bgClass="bg-primary/5" />
            <DashCard label="Indispensáveis" value={indispensaveis.length} pct={pctIndisp} icon={<CheckCircle2 className="w-5 h-5" />} colorClass="text-secondary" bgClass="bg-secondary/5" />
            <DashCard label="Recomendadas" value={recomendadas.length} pct={pctRecom} icon={<CheckCircle2 className="w-5 h-5" />} colorClass="text-muted-foreground" bgClass="bg-muted/50" />
          </div>

          {/* Executive Summary */}
          <div className="bg-primary/5 rounded-xl border border-primary/20 p-6">
            <h3 className="font-semibold text-primary mb-2">Síntese do Diagnóstico</h3>
            <p className="text-sm text-foreground leading-relaxed">
              Esta avaliação inicial identificou <strong>{total} ação(ões)</strong> necessária(s)
              para adequação da empresa <strong>{company.legalName}</strong> aos requisitos de
              prevenção dos riscos psicossociais.
              {obrigatorias.length > 0 && (
                <>
                  {" "}Destas, <strong>{obrigatorias.length}</strong> são de caráter obrigatório e devem
                  ser implementadas com prioridade imediata.
                </>
              )}
              {indispensaveis.length > 0 && (
                <>
                  {" "}Foram identificadas <strong>{indispensaveis.length}</strong> ação(ões)
                  indispensáveis para a estruturação adequada da prevenção.
                </>
              )}
              {recomendadas.length > 0 && (
                <>
                  {" "}Adicionalmente, <strong>{recomendadas.length}</strong> ação(ões) são recomendadas
                  para elevar o nível de maturidade da gestão de riscos psicossociais.
                </>
              )}{" "}
              Este diagnóstico inicial não substitui o levantamento formal dos riscos psicossociais,
              mas serve como etapa preparatória essencial para que a empresa se organize antes do
              levantamento completo pela equipe da Med Work.
            </p>
          </div>

          {/* Actions by classification */}
          {actionPlan.length === 0 ? (
            <div className="bg-secondary/10 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-secondary mx-auto mb-3" />
              <p className="text-lg font-semibold text-foreground">Parabéns!</p>
              <p className="text-sm text-muted-foreground">
                Nenhuma ação corretiva identificada nesta avaliação.
              </p>
            </div>
          ) : (
            <>
              {[
                { title: "Ações Obrigatórias", items: obrigatorias, color: "border-l-primary" },
                { title: "Ações Indispensáveis", items: indispensaveis, color: "border-l-secondary" },
                { title: "Ações Recomendadas", items: recomendadas, color: "border-l-muted-foreground" },
              ]
                .filter((s) => s.items.length > 0)
                .map((section) => (
                  <div key={section.title} className="space-y-3">
                    <h3 className="text-lg font-bold text-foreground">{section.title}</h3>
                    {section.items.map((action, i) => (
                      <div
                        key={i}
                        className={`bg-card rounded-lg border border-border border-l-4 ${section.color} p-5 space-y-2 hover:shadow-sm transition-shadow`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            Item {action.questionCode}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${classificationColors[action.classification]}`}
                          >
                            {action.classification}
                          </span>
                          <span className={`text-xs font-semibold ${priorityColors[action.priority]}`}>
                            Prioridade {action.priority}
                          </span>
                          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {action.theme}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{action.actionText}</p>
                        <p className="text-xs text-muted-foreground italic">
                          Resposta: {action.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
            </>
          )}

          {/* BLOCK 2: Next Step CTA */}
          {evalId && (
            <div className="bg-card rounded-xl border-2 border-primary/30 p-6 sm:p-8 space-y-4 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Próximo passo do processo</h3>
              </div>

              {quoteSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Solicitação enviada com sucesso!</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      A equipe da Med Work receberá sua solicitação e entrará em contato em breve.
                    </p>
                  </div>
                </div>
              )}

              {proposalApproved ? (
                <>
                  <p className="text-sm text-foreground leading-relaxed">
                    A proposta da Med Work foi aceita. A próxima etapa da jornada já está disponível.
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Proposta aceita
                  </span>
                </>
              ) : proposalSent && proposalLink ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    A proposta da Med Work está disponível para sua análise. Clique no botão abaixo para visualizar.
                  </p>
                  <a
                    href={proposalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-3 px-6 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    <FileText className="w-4 h-4" /> Ver proposta
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Após analisar, aguarde a confirmação da Med Work para avançar.
                  </p>
                </div>
              ) : quoteRequested ? (
                <div className="space-y-2">
                  <p className="text-sm text-foreground leading-relaxed">
                    Sua solicitação de orçamento foi enviada para a equipe da Med Work.
                    Acompanhe o progresso na timeline abaixo.
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin" /> Aguardando proposta
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-foreground leading-relaxed">
                    Com base nos resultados desta avaliação inicial, o próximo passo é a{" "}
                    <strong>avaliação completa dos riscos psicossociais</strong> realizada pela
                    equipe especializada da Med Work. Essa avaliação incluirá entrevistas com
                    lideranças, aplicação de questionários validados e análise aprofundada para
                    compor o inventário de riscos e o plano de ação do PGR.
                  </p>
                  <button
                    onClick={handleRequestQuote}
                    disabled={quoteSending || !evaluator}
                    className="flex items-center gap-2 py-3 px-6 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {quoteSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Solicitar orçamento para a Med Work
                      </>
                    )}
                  </button>
                  {!evaluator && (
                    <p className="text-xs text-muted-foreground">
                      Dados do avaliador necessários para solicitar orçamento.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* BLOCK 3: Journey Timeline */}
          {journeyStages.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-4 print:hidden">
              <h3 className="text-lg font-bold text-foreground">Acompanhamento do processo</h3>
              <p className="text-sm text-muted-foreground">
                Visão completa do progresso da sua empresa no ciclo de adequação aos riscos psicossociais.
                Cada etapa é registrada e rastreável.
              </p>
              <JourneyTimeline stages={journeyStages} />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-4 print:hidden">
            <button
              onClick={handlePDF}
              className="flex items-center gap-2 py-3 px-6 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 py-3 px-6 rounded-lg border border-border text-foreground font-medium hover:bg-muted/50 active:scale-[0.98] transition-all"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button
              onClick={handleNew}
              className="flex items-center gap-2 py-3 px-6 rounded-lg border border-border text-foreground font-medium hover:bg-muted/50 active:scale-[0.98] transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Nova avaliação
            </button>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center border-t border-border print:hidden space-y-1">
        <p className="text-xs text-muted-foreground font-medium">
          © {new Date().getFullYear()} Med Work — Gestão de Riscos Ocupacionais
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          Processo padronizado · Rastreabilidade completa · Operação em escala nacional
        </p>
      </footer>
    </div>
  );
};

function InfoLine({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-muted-foreground flex items-center gap-1 shrink-0">
        {icon}
        {label}
      </span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}

function DashCard({
  label,
  value,
  pct,
  icon,
  colorClass,
  bgClass,
}: {
  label: string;
  value: number;
  pct: number | null;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={`${bgClass} rounded-lg border border-border p-4 text-center space-y-1`}>
      <div className={`mx-auto ${colorClass}`}>{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {pct !== null && <p className="text-xs font-medium text-muted-foreground">{pct}%</p>}
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default ResultPage;
