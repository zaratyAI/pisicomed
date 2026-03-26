interface InfoRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export function InfoRow({ label, value, icon }: InfoRowProps) {
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
