import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEvaluation } from "@/contexts/EvaluationContext";
import { questions, blocks } from "@/data/questions";
import { generateActionPlan } from "@/utils/actionPlan";
import { saveAnswer } from "@/utils/database";
import logo from "@/assets/logo-medwork.png";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";

const EvaluationPage = () => {
  const navigate = useNavigate();
  const { company, answers, setAnswer, currentIndex, setCurrentIndex, setActionPlan, setEvaluationDate, evaluationId } = useEvaluation();
  const [noteText, setNoteText] = useState("");

  if (!company) {
    navigate("/");
    return null;
  }

  const q = questions[currentIndex];
  const currentAnswer = answers[q.code];
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);
  const currentBlock = q.block;
  const blockIndex = blocks.indexOf(currentBlock);

  const handleAnswer = async (value: "SIM" | "NAO") => {
    const answerData = { answer: value, notes: noteText || currentAnswer?.notes };
    setAnswer(q.code, answerData);
    setNoteText("");

    // Save to database
    if (evaluationId) {
      try {
        await saveAnswer(evaluationId, q.code, value, answerData.notes);
      } catch (err) {
        console.error("Error saving answer:", err);
      }
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setNoteText("");
    }
  };

  const goToReview = () => {
    navigate("/revisao");
  };

  const allAnswered = questions.every((q) => answers[q.code]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Med Work" className="h-8 w-auto cursor-pointer" onClick={() => navigate("/avaliador")} />
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">Empresa</p>
            <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{company.legalName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Progresso</p>
          <p className="text-sm font-semibold text-primary">{progress}%</p>
        </div>
      </header>

      <div className="h-1 bg-muted">
        <div className="h-full bg-secondary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="px-6 py-3 bg-primary/5 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
            Bloco {blockIndex + 1}/{blocks.length}
          </span>
          <span className="text-sm font-medium text-foreground">{currentBlock}</span>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl animate-fade-in" key={q.code}>
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 sm:p-10 space-y-8">
            <div>
              <span className="text-xs font-medium text-muted-foreground mb-2 block">
                Pergunta {currentIndex + 1} de {questions.length} — Item {q.code}
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-relaxed" style={{ lineHeight: "1.4" }}>
                {q.title}
              </h2>
            </div>

            <div className="flex gap-4">
              <button onClick={() => handleAnswer("SIM")}
                className={`flex-1 py-4 rounded-lg text-lg font-semibold transition-all active:scale-[0.97] ${
                  currentAnswer?.answer === "SIM" ? "bg-secondary text-secondary-foreground ring-2 ring-secondary" : "bg-muted text-foreground hover:bg-secondary/20"
                }`}>
                Sim
              </button>
              <button onClick={() => handleAnswer("NAO")}
                className={`flex-1 py-4 rounded-lg text-lg font-semibold transition-all active:scale-[0.97] ${
                  currentAnswer?.answer === "NAO" ? "bg-primary text-primary-foreground ring-2 ring-primary" : "bg-muted text-foreground hover:bg-primary/20"
                }`}>
                Não
              </button>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Observação (opcional)
              </label>
              <textarea value={noteText || currentAnswer?.notes || ""} onChange={(e) => setNoteText(e.target.value)}
                onBlur={() => { if (currentAnswer && noteText) setAnswer(q.code, { ...currentAnswer, notes: noteText }); }}
                placeholder="Escreva aqui uma observação sobre este item, se desejar..." rows={2}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button onClick={goBack} disabled={currentIndex === 0}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>

              {currentIndex < questions.length - 1 ? (
                <button onClick={() => { if (currentAnswer) setCurrentIndex(currentIndex + 1); }}
                  disabled={!currentAnswer}
                  className="flex items-center gap-1 text-sm text-primary font-medium hover:underline disabled:opacity-30 transition-colors">
                  Próxima <ChevronRight className="w-4 h-4" />
                </button>
              ) : allAnswered ? (
                <button onClick={goToReview}
                  className="py-2 px-5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all">
                  Revisar respostas
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">Responda todas para avançar</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EvaluationPage;
