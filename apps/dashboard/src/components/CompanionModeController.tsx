import { useEffect } from "react";

const COMPANION_SIZE_FIX_CSS = `
.floating-panel.companion-bar {
  width: min(520px, calc(100vw - 32px)) !important;
  height: 64px !important;
  min-height: 64px !important;
  max-height: 64px !important;
  overflow: visible !important;
  border-radius: 18px !important;
}

.floating-panel.companion-bar .floating-titlebar {
  position: absolute !important;
  inset: 0 0 auto 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  pointer-events: none;
  z-index: 30;
}

.floating-panel.companion-bar .floating-titlebar .titlebar-actions {
  position: absolute !important;
  top: -14px !important;
  right: -8px !important;
  pointer-events: auto;
}

.floating-panel.companion-bar .companion-bar-toggle {
  width: 26px !important;
  height: 26px !important;
  min-width: 26px !important;
  padding: 0 !important;
  border-radius: 999px !important;
  opacity: 0 !important;
  transform: translateY(4px) scale(.96) !important;
  transition: opacity .16s ease, transform .16s ease !important;
  background: rgba(20, 29, 26, .78) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.floating-panel.companion-bar:hover .companion-bar-toggle {
  opacity: 1 !important;
  transform: translateY(0) scale(1) !important;
}

.floating-panel.companion-bar .floating-body {
  height: 64px !important;
  min-height: 64px !important;
  padding: 8px !important;
  display: block !important;
  overflow: visible !important;
}

.floating-panel.companion-bar .composer {
  height: 48px !important;
  min-height: 48px !important;
  max-height: 48px !important;
  padding: 0 !important;
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr) !important;
  gap: 8px !important;
  align-items: center !important;
  overflow: visible !important;
}

.floating-panel.companion-bar .composer-header-actions {
  position: static !important;
  grid-column: 1 !important;
  grid-row: 1 !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  margin: 0 !important;
  width: auto !important;
}

.floating-panel.companion-bar .composer-header-actions button,
.floating-panel.companion-bar .input-inline-actions button {
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  max-width: 34px !important;
  padding: 0 !important;
  flex: 0 0 34px !important;
}

.floating-panel.companion-bar .composer-input-wrap {
  grid-column: 2 !important;
  grid-row: 1 !important;
  height: 48px !important;
  min-height: 48px !important;
  max-height: 48px !important;
  overflow: hidden !important;
  border-radius: 16px !important;
  background: rgba(12, 18, 16, .46) !important;
  border: 1px solid rgba(180, 244, 200, .18) !important;
  backdrop-filter: blur(20px) saturate(1.25);
  -webkit-backdrop-filter: blur(20px) saturate(1.25);
}

.floating-panel.companion-bar .composer-input-wrap textarea {
  height: 48px !important;
  min-height: 48px !important;
  max-height: 48px !important;
  padding: 14px 86px 12px 14px !important;
  line-height: 1.25 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  resize: none !important;
  background: transparent !important;
}

.floating-panel.companion-bar .input-inline-actions {
  right: 7px !important;
  bottom: 50% !important;
  transform: translateY(50%) !important;
  gap: 6px !important;
}

.floating-panel.companion-bar .live-mode-surface {
  grid-column: 2 !important;
  grid-row: 1 !important;
  height: 48px !important;
  min-height: 48px !important;
  max-height: 48px !important;
  padding: 0 14px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 10px !important;
  overflow: hidden !important;
  border-radius: 16px !important;
}

.floating-panel.companion-bar .live-orb {
  width: 30px !important;
  height: 30px !important;
  flex: 0 0 30px !important;
}

.floating-panel.companion-bar .live-orb span {
  width: 11px !important;
  height: 11px !important;
}

.floating-panel.companion-bar .live-mode-surface strong {
  font-size: 13px !important;
  line-height: 1 !important;
}
`;

export function CompanionModeController() {
  useEffect(() => {
    function ensureStyle() {
      if (document.getElementById("companion-size-fix-css")) return;
      const style = document.createElement("style");
      style.id = "companion-size-fix-css";
      style.textContent = COMPANION_SIZE_FIX_CSS;
      document.head.appendChild(style);
    }

    function wireCompanion() {
      ensureStyle();
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
