interface DashCardProps {
  label: string;
  value: number;
  pct: number | null;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

export function DashCard({ label, value, pct, icon, colorClass, bgClass }: DashCardProps) {
  return (
    <div className={`${bgClass} rounded-lg border border-border p-4 text-center space-y-1`}>
      <div className={`mx-auto ${colorClass}`}>{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {pct !== null && <p className="text-xs font-medium text-muted-foreground">{pct}%</p>}
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
