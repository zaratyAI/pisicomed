import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEvaluation } from "@/contexts/EvaluationContext";
import { questions } from "@/data/questions";
import { generateActionPlan } from "@/utils/actionPlan";
import { finalizeEvaluation } from "@/utils/database";
import { createJourneyForEvaluation } from "@/utils/journey";
import logo from "@/assets/logo-medwork.png";
import { CheckCircle2, XCircle, Edit3, Loader2 } from "lucide-react";

const ReviewPage = () => {
  const navigate = useNavigate();
  const { company, evaluator, answers, setCurrentIndex, setActionPlan, setEvaluationDate, evaluationId } = useEvaluation();
  const [saving, setSaving] = useState(false);

  if (!company) { navigate("/"); return null; }

  const allAnswered = questions.every((q) => answers[q.code]);

  const finalize = async () => {
    setSaving(true);
    const plan = generateActionPlan(questions, answers);
    const date = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    
    setActionPlan(plan);
    setEvaluationDate(date);

    // Save to database
    if (evaluationId) {
      try {
        const obrigatorias = plan.filter((a) => a.classification === "Obrigatória").length;
        const indispensaveis = plan.filter((a) => a.classification === "Indispensável").length;
        const recomendadas = plan.filter((a) => a.classification === "Recomendada").length;

        await finalizeEvaluation(evaluationId, plan, {
          total: plan.length,
          obrigatorias,
          indispensaveis,
          recomendadas,
          date,
          evaluator: evaluator ? { name: evaluator.name, cpf: evaluator.cpf, email: evaluator.email, roleTitle: evaluator.roleTitle } : null,
        });

        // Create journey stages for this evaluation
        try {
          await createJourneyForEvaluation(evaluationId);
        } catch (journeyErr) {
          console.error("Error creating journey:", journeyErr);
        }
      } catch (err) {
        console.error("Error finalizing:", err);
      }
    }

    setSaving(false);
    navigate("/resultado");
  };

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
    navigate("/avaliacao");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <img src={logo} alt="Med Work" className="h-10 w-auto cursor-pointer" onClick={() => navigate("/avaliador")} />
        <span className="text-sm font-medium text-muted-foreground">Revisão das respostas</span>
      </header>

      <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="animate-reveal-up space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Revisão da avaliação</h2>
            <p className="text-sm text-muted-foreground">{company.legalName} — {company.cnpj}</p>
            {evaluator && <p className="text-sm text-muted-foreground">Avaliador: {evaluator.name}</p>}
          </div>

          <div className="space-y-2">
            {questions.map((q, i) => {
              const a = answers[q.code];
              return (
                <div key={q.code} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow">
                  <div className="mt-0.5">
                    {a?.answer === "SIM" ? <CheckCircle2 className="w-5 h-5 text-secondary" /> :
                     a?.answer === "NAO" ? <XCircle className="w-5 h-5 text-primary" /> :
                     <div className="w-5 h-5 rounded-full border-2 border-border" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{q.code}. {q.title}</p>
                    {a?.notes && <p className="text-xs text-muted-foreground mt-1 italic">Obs: {a.notes}</p>}
                  </div>
                  <button onClick={() => goToQuestion(i)} className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors" title="Editar resposta">
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => navigate("/avaliacao")}
              className="flex-1 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted/50 active:scale-[0.98] transition-all">
              Voltar ao checklist
            </button>
            <button onClick={finalize} disabled={!allAnswered || saving}
              className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : "Gerar plano de ação"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReviewPage;
