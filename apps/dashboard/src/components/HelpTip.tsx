export function HelpTip({ text }: { text: string }) {
  return <span className="tip" title={text}>?</span>;
}
