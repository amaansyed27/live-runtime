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
        <strong>Factory reset</strong>
        <p>Restores Live Runtime to a fresh local state.</p>
        <button type="button" class="danger-soft">Factory Reset</button>
      `;

      const button = card.querySelector("button");
      button?.addEventListener("click", async () => {
        const confirmed = window.confirm("Factory reset Live Runtime on this device?");
        if (!confirmed) return;
        await clearJournal();
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith("live-runtime."))
          .forEach((key) => window.localStorage.removeItem(key));
        window.location.reload();
      });

      grid.appendChild(card);
    }

    mount();
    const timer = window.setInterval(mount, 500);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
