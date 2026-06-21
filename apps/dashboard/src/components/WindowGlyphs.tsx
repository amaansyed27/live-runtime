export function ArrowGlyph({ direction }: { direction: "up" | "down" }) {
  const path = direction === "up" ? "m7 14 5-5 5 5" : "m7 10 5 5 5-5";
  return <svg className="companion-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={path} /></svg>;
}

export function XGlyph() {
  return <svg className="companion-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 7l10 10" /><path d="M17 7 7 17" /></svg>;
}
