import { PipelineStatus, PIPELINE_LABELS, PIPELINE_COLORS } from "@/utils/pipeline";

interface PipelineBadgeProps {
  status: PipelineStatus;
  className?: string;
}

export function PipelineBadge({ status, className = "" }: PipelineBadgeProps) {
  const colors = PIPELINE_COLORS[status] || PIPELINE_COLORS.avaliacao_inicial;
  const label = PIPELINE_LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text} ${className}`}
    >
      {label}
    </span>
  );
}
