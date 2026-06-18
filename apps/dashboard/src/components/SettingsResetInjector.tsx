import { useEffect } from "react";
import { clearJournal } from "../lib/journalBridge";

export function SettingsResetInjector() {
  useEffect(() => {
    function mount() {
      const grid = document.querySelector(".settings-grid");
      if (!grid || document.getElementById("live-runtime-data-reset")) return;

      const card = document.createElement("section");
      card.id = "live-runtime-data-reset";
      card.className = "settings-card reset-card";
      card.innerHTML = `
        <span>Data</span>
        <strong>Reset Everything</strong>
        <p>Deletes local chats, memories, vectors, profile entries, skills, routines, settings, and cached app state.</p>
        <button type="button" class="danger-soft">Reset Everything</button>
      `;

      const button = card.querySelector("button");
      button?.addEventListener("click", async () => {
        const confirmed = window.confirm("Delete all Live Runtime local data on this device and return to factory state?");
        if (!confirmed) return;
        await clearJournal();
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith("live-runtime."))
          .forEach((key) => window.localStorage.removeItem(key));
        window.location.reload();
      });

      grid.prepend(card);
    }

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(mount, 350);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
