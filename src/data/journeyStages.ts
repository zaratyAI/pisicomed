export interface JourneyStageDefinition {
  code: number;
  name: string;
  description: string;
}

export const JOURNEY_STAGES: JourneyStageDefinition[] = [
  {
    code: 1,
    name: "Diagnóstico inicial",
    description: "Checklist de conformidade básica dos riscos psicossociais",
  },
  {
    code: 2,
    name: "Proposta comercial",
    description: "Elaboração e aprovação da proposta para avaliação completa",
  },
  {
    code: 3,
    name: "Agendamento técnico",
    description: "Definição de data para avaliação com lideranças e gestão",
  },
  {
    code: 4,
    name: "Avaliação com lideranças",
    description: "Entrevista técnica com alta gestão, diretoria, RH e líderes",
  },
  {
    code: 5,
    name: "Pesquisa organizacional",
    description: "Aplicação de questionários validados com todos os colaboradores",
  },
  {
    code: 6,
    name: "Análise técnica",
    description: "Processamento e interpretação especializada dos resultados",
  },
  {
    code: 7,
    name: "Atualização do PGR",
    description: "Inclusão no inventário de riscos e plano de ação do PGR",
  },
  {
    code: 8,
    name: "Processo concluído",
    description: "Entrega final e encerramento do ciclo de adequação",
  },
];

export type StageStatus =
  | "pendente"
  | "concluida"
  | "em_andamento"
  | "aguardando_acao"
  | "disponivel"
  | "solicitada"
  | "aguardando_proposta"
  | "proposta_enviada"
  | "proposta_aceita"
  | "agendado"
  | "realizado"
  | "cancelado"
  | "nao_convertido";

// Human-readable labels for all stage statuses
export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  pendente: "Aguardando liberação",
  concluida: "Concluída",
  em_andamento: "Em execução",
  aguardando_acao: "Ação necessária",
  disponivel: "Pronta para iniciar",
  solicitada: "Solicitação registrada",
  aguardando_proposta: "Proposta em elaboração",
  proposta_enviada: "Proposta disponível para análise",
  proposta_aceita: "Proposta aprovada",
  agendado: "Data confirmada",
  realizado: "Executada com sucesso",
  cancelado: "Cancelada",
  nao_convertido: "Não convertido",
};
