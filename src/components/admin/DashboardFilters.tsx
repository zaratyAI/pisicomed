import { Search, Filter, X } from "lucide-react";
import { PIPELINE_LABELS } from "@/utils/pipeline";
import { JOURNEY_STAGES } from "@/data/journeyStages";

const STAGE_FILTERS = [
  { label: "Todas etapas", value: "" },
  ...JOURNEY_STAGES.map((s) => ({ label: s.name, value: String(s.code) })),
];

const PIPELINE_FILTERS = [
  { label: "Todos os status", value: "" },
  ...Object.entries(PIPELINE_LABELS).map(([value, label]) => ({ value, label })),
];

const ALERT_FILTERS = [
  { label: "Todos os alertas", value: "" },
  { label: "Atrasados", value: "overdue" },
  { label: "Parados", value: "stalled" },
  { label: "Próximos", value: "upcoming" },
];

export interface FilterState {
  search: string;
  stageFilter: string;
  pipelineFilter: string;
  alertFilter: string;
}

interface DashboardFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export function DashboardFilters({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: DashboardFiltersProps) {
  const hasActiveFilters =
    filters.stageFilter || filters.pipelineFilter || filters.alertFilter || filters.search;

  const update = (partial: Partial<FilterState>) =>
    onChange({ ...filters, ...partial });

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gestão de Jornadas
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredCount === totalCount
              ? `${totalCount} caso(s)`
              : `${filteredCount} de ${totalCount} caso(s)`}
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Buscar CNPJ, empresa, avaliador..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />

        <select
          value={filters.pipelineFilter}
          onChange={(e) => update({ pipelineFilter: e.target.value })}
          className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {PIPELINE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={filters.stageFilter}
          onChange={(e) => update({ stageFilter: e.target.value })}
          className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {STAGE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={filters.alertFilter}
          onChange={(e) => update({ alertFilter: e.target.value })}
          className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {ALERT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() =>
              onChange({
                search: "",
                stageFilter: "",
                pipelineFilter: "",
                alertFilter: "",
              })
            }
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
