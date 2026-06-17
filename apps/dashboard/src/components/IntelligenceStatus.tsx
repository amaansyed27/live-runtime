import { useEffect, useState } from "react";
import { getJournalStatus, type JournalStatus } from "../lib/journalBridge";
import { checkEmbeddingModel, EMBED_MODEL } from "../lib/semantic";

interface IntelligenceStatusProps {
  baseUrl: string;
}

type EmbedState = "checking" | "ready" | "missing" | "offline";

export function IntelligenceStatus({ baseUrl }: IntelligenceStatusProps) {
  const [status, setStatus] = useState<JournalStatus | null>(null);
  const [embedState, setEmbedState] = useState<EmbedState>("checking");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [journalStatus, embeddingReady] = await Promise.all([
        getJournalStatus(),
        checkEmbeddingModel(baseUrl)
      ]);
      if (cancelled) return;
      setStatus(journalStatus);
      setEmbedState(embeddingReady === null ? "offline" : embeddingReady ? "ready" : "missing");
    }
    setEmbedState("checking");
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [baseUrl]);

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
    </section>
  );
}

function embeddingLabel(state: EmbedState): string {
  if (state === "ready") return EMBED_MODEL;
  if (state === "missing") return `Run: ollama pull ${EMBED_MODEL}`;
  if (state === "offline") return "Ollama offline";
  return "Checking";
}
