export function UiBrand({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`brand-block ${compact ? "brand-compact" : ""}`} data-tauri-drag-region>
      <img className="brand-mark" src="/live-runtime-logo.svg" alt="Live Runtime logo" />
      <div><p>{label}</p><small>Local AI</small></div>
    </div>
  );
}
