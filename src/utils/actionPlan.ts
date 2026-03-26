import { Question } from "@/data/questions";

export interface ActionItem {
  questionCode: string;
  questionTitle: string;
  answer: string;
  actionText: string;
  classification: string;
  priority: string;
  theme: string;
  block: string;
}

export function generateActionPlan(
  questions: Question[],
  answers: Record<string, { answer: string; notes?: string }>
): ActionItem[] {
  const actions: ActionItem[] = [];

  for (const q of questions) {
    const a = answers[q.code];
    if (!a) continue;

    const shouldTrigger =
      (q.triggerAnswer === "NAO" && a.answer === "NAO") ||
      (q.triggerAnswer === "SIM" && a.answer === "SIM");

    if (shouldTrigger) {
      actions.push({
        questionCode: q.code,
        questionTitle: q.title,
        answer: a.answer === "SIM" ? "Sim" : "Não",
        actionText: q.actionText,
        classification: q.classification,
        priority: q.priority,
        theme: q.theme,
        block: q.block,
      });
    }
  }

  // Sort: Alta first, then Média, then Baixa
  const priorityOrder = { Alta: 0, Média: 1, Baixa: 2 };
  actions.sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3)
  );

  return actions;
}
