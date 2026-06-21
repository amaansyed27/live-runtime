export function UiBrand({ label }: { label: string }) {
  return <div className="brand-block"><img className="brand-mark" src="/live-runtime-logo.svg" alt="Live Runtime logo" /><div><p>{label}</p><small>Local AI</small></div></div>;
}
