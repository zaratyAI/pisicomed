import React, { createContext, useContext, useState, useCallback } from "react";
import { CompanyData } from "@/utils/cnpj";
import { ActionItem } from "@/utils/actionPlan";
import { EvaluatorData } from "@/utils/database";

interface Answer {
  answer: string;
  notes?: string;
}

interface EvaluationState {
  company: CompanyData | null;
  evaluator: EvaluatorData | null;
  answers: Record<string, Answer>;
  currentIndex: number;
  actionPlan: ActionItem[];
  evaluationDate: string;
  evaluationId: string | null;
}

interface EvaluationContextType extends EvaluationState {
  setCompany: (c: CompanyData) => void;
  setEvaluator: (e: EvaluatorData) => void;
  setAnswer: (code: string, answer: Answer) => void;
  setCurrentIndex: (i: number) => void;
  setActionPlan: (p: ActionItem[]) => void;
  setEvaluationDate: (d: string) => void;
  setEvaluationId: (id: string) => void;
  reset: () => void;
}

const initial: EvaluationState = {
  company: null,
  evaluator: null,
  answers: {},
  currentIndex: 0,
  actionPlan: [],
  evaluationDate: "",
  evaluationId: null,
};

const EvaluationContext = createContext<EvaluationContextType | null>(null);

export function EvaluationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EvaluationState>(initial);

  const setCompany = useCallback((company: CompanyData) => setState((s) => ({ ...s, company })), []);
  const setEvaluator = useCallback((evaluator: EvaluatorData) => setState((s) => ({ ...s, evaluator })), []);
  const setAnswer = useCallback((code: string, answer: Answer) =>
    setState((s) => ({ ...s, answers: { ...s.answers, [code]: answer } })), []);
  const setCurrentIndex = useCallback((currentIndex: number) => setState((s) => ({ ...s, currentIndex })), []);
  const setActionPlan = useCallback((actionPlan: ActionItem[]) => setState((s) => ({ ...s, actionPlan })), []);
  const setEvaluationDate = useCallback((evaluationDate: string) => setState((s) => ({ ...s, evaluationDate })), []);
  const setEvaluationId = useCallback((evaluationId: string) => setState((s) => ({ ...s, evaluationId })), []);
  const reset = useCallback(() => setState(initial), []);

  return (
    <EvaluationContext.Provider
      value={{ ...state, setCompany, setEvaluator, setAnswer, setCurrentIndex, setActionPlan, setEvaluationDate, setEvaluationId, reset }}
    >
      {children}
    </EvaluationContext.Provider>
  );
}

export function useEvaluation() {
  const ctx = useContext(EvaluationContext);
  if (!ctx) throw new Error("useEvaluation must be inside EvaluationProvider");
  return ctx;
}
