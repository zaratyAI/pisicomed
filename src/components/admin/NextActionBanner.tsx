import { ArrowRight } from "lucide-react";

interface NextActionBannerProps {
  action: string | null;
}

export function NextActionBanner({ action }: NextActionBannerProps) {
  if (!action) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
      <ArrowRight className="w-4 h-4 text-primary shrink-0" />
      <span className="text-sm font-medium text-primary">
        {action}
      </span>
    </div>
  );
}
