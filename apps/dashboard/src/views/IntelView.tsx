import { IntelligenceStatus } from "../components/IntelligenceStatus";

export function IntelView({ baseUrl }: { baseUrl: string }) {
  return (
    <section className="page-panel intelligence-page">
      <div className="page-header"><p className="eyebrow">Intelligence</p><h2>Personal engine</h2></div>
      <div className="intelligence-layout">
        <section className="intel-hero"><span>Core idea</span><strong>One chat. Long context.</strong></section>
        <IntelligenceStatus baseUrl={baseUrl} />
        <section className="intel-grid">
          <article><span>Profile</span><strong>Learns how you work</strong></article>
          <article><span>Local DB</span><strong>Chats, tasks, docs</strong></article>
          <article><span>Vectors</span><strong>Semantic recall</strong></article>
          <article><span>Reflection</span><strong>Turns patterns into skills</strong></article>
        </section>
        <section className="automation-card compact-note"><span>Local first</span><strong>SQLite + vector index + Ollama embeddings.</strong><p>The database becomes long-term context.</p></section>
        <section className="intel-flow"><span>Capture</span><span>Embed</span><span>Store</span><span>Retrieve</span><span>Reflect</span></section>
      </div>
    </section>
  );
}
