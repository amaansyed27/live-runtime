import { useEffect } from "react";

export function CompanionModeController() {
  useEffect(() => {
    function wireCompanion() {
      const panel = document.querySelector<HTMLElement>(".floating-panel");
      const actions = document.querySelector<HTMLElement>(".floating-titlebar .titlebar-actions");
      if (!panel || !actions || document.getElementById("companion-bar-toggle")) return;

      const button = document.createElement("button");
      button.id = "companion-bar-toggle";
      button.type = "button";
      button.className = "companion-bar-toggle";
      button.title = "Compact companion";
      button.setAttribute("aria-label", "Toggle compact companion");
      button.textContent = "⌄";
      button.addEventListener("click", () => {
        const compact = panel.classList.toggle("companion-bar");
        button.textContent = compact ? "⌃" : "⌄";
        button.title = compact ? "Restore companion" : "Compact companion";
      });

      actions.prepend(button);
    }

    wireCompanion();
    const observer = new MutationObserver(wireCompanion);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(wireCompanion, 500);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
