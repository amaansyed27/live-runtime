interface SignalCardProps {
  label: string;
  value: string;
  tone?: "good" | "warn" | "neutral";
}

export function SignalCard({ label, value, tone = "neutral" }: SignalCardProps) {
  return (
    <div className={`signal-card signal-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
