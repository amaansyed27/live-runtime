import { useEffect, useState } from "react";
import { clearJournal, getJournalStatus, type JournalStatus } from "../lib/journalBridge";
import { checkEmbeddingModel, EMBED_MODEL } from "../lib/semantic";

interface IntelligenceStatusProps {
  baseUrl: string;
}

type EmbedState = "checking" | "ready" | "missing" | "offline";

export function IntelligenceStatus({ baseUrl }: IntelligenceStatusProps) {
  const [status, setStatus] = useState<JournalStatus | null>(null);
  const [embedState, setEmbedState] = useState<EmbedState>("checking");
  const [isResetting, setIsResetting] = useState(false);

  async function load() {
    const [journalStatus, embeddingReady] = await Promise.all([
      getJournalStatus(),
      checkEmbeddingModel(baseUrl)
    ]);
    setStatus(journalStatus);
    setEmbedState(embeddingReady === null ? "offline" : embeddingReady ? "ready" : "missing");
  }

  useEffect(() => {
    let cancelled = false;
    async function safeLoad() {
      const [journalStatus, embeddingReady] = await Promise.all([
        getJournalStatus(),
        checkEmbeddingModel(baseUrl)
      ]);
      if (cancelled) return;
      setStatus(journalStatus);
      setEmbedState(embeddingReady === null ? "offline" : embeddingReady ? "ready" : "missing");
    }
    setEmbedState("checking");
    void safeLoad();
    const timer = window.setInterval(() => void safeLoad(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [baseUrl]);

  async function resetMemoryStore() {
    const confirmed = window.confirm("Reset Live Runtime memories, profile entries, skills, and vectors?");
    if (!confirmed) return;
    setIsResetting(true);
    try {
      const nextStatus = await clearJournal();
      setStatus(nextStatus);
      await load();
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <section className="intel-status" aria-label="Intelligence status">
      <article><span>Memories</span><strong>{status?.memoryCount ?? "—"}</strong></article>
      <article><span>Vectors</span><strong>{status?.vectorCount ?? "—"}</strong></article>
      <article><span>Profile</span><strong>{status?.profileCount ?? "—"}</strong></article>
      <article><span>Skills</span><strong>{status?.skillCount ?? "—"}</strong></article>
      <article className={embedState === "ready" ? "good" : embedState === "missing" ? "warn" : ""}>
        <span>Embedding</span>
        <strong>{embeddingLabel(embedState)}</strong>
      </article>
      <article className="wide"><span>Database</span><strong>{status?.databasePath ?? "Not created yet"}</strong></article>
      <article className="wide memory-reset"><span>Memory controls</span><strong>Reset local intelligence store</strong><button type="button" className="danger-soft" disabled={isResetting} onClick={() => void resetMemoryStore()}>{isResetting ? "Resetting" : "Reset Memories"}</button></article>
    </section>
  );
}

function embeddingLabel(state: EmbedState): string {
  if (state === "ready") return EMBED_MODEL;
  if (state === "missing") return `Run: ollama pull ${EMBED_MODEL}`;
  if (state === "offline") return "Ollama offline";
  return "Checking";
}
