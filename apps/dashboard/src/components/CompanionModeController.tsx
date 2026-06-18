import { useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

const COMPACT_SIZE = new LogicalSize(390, 64);
const EXPANDED_SIZE = new LogicalSize(340, 410);
const COMPACT_MIN_SIZE = new LogicalSize(340, 64);
const EXPANDED_MIN_SIZE = new LogicalSize(300, 92);

const CHEVRON_DOWN_ICON = `
<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
  <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

const CHEVRON_UP_ICON = `
<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
  <path d="M5.5 12.5 10 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

const COMPANION_SIZE_FIX_CSS = `
.floating-panel.companion-bar {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  min-width: 100vw !important;
  max-width: 100vw !important;
  height: 64px !important;
  min-height: 64px !important;
  max-height: 64px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  border-radius: 18px !important;
  cursor: grab;
}

.floating-panel.companion-bar:active {
  cursor: grabbing;
}

.floating-panel.companion-bar .floating-titlebar {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  pointer-events: none;
  z-index: 60;
}

.floating-panel.companion-bar .floating-titlebar .titlebar-actions {
  position: absolute !important;
  top: 5px !important;
  right: 5px !important;
  display: flex !important;
  align-items: center !important;
  gap: 0 !important;
  pointer-events: auto;
  z-index: 70;
}

.floating-panel.companion-bar .floating-titlebar .titlebar-actions > button:not(.companion-bar-toggle) {
  display: none !important;
}

.companion-bar-toggle {
  display: grid !important;
  place-items: center !important;
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  max-width: 28px !important;
  padding: 0 !important;
  border-radius: 999px !important;
  border: 1px solid rgba(185, 237, 206, .22) !important;
  color: rgba(232, 247, 236, .94) !important;
  background: rgba(12, 19, 17, .72) !important;
  box-shadow: 0 10px 26px rgba(0, 0, 0, .22), inset 0 1px 0 rgba(255,255,255,.06) !important;
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  transition: opacity .16s ease, transform .16s ease, background .16s ease, border-color .16s ease !important;
}

.companion-bar-toggle svg {
  width: 16px !important;
  height: 16px !important;
  display: block !important;
}

.companion-bar-toggle:hover {
  background: rgba(20, 44, 34, .86) !important;
  border-color: rgba(185, 237, 206, .42) !important;
  transform: translateY(-1px) !important;
}

.floating-panel.companion-bar .companion-bar-toggle {
  opacity: .9 !important;
}

.floating-panel.companion-bar:hover .companion-bar-toggle {
  opacity: 1 !important;
}

.floating-panel.companion-bar .floating-body {
  width: 100% !important;
  height: 64px !important;
  min-height: 64px !important;
  max-height: 64px !important;
  padding: 8px !important;
  margin: 0 !important;
  display: block !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

.floating-panel.companion-bar .companion-body,
.floating-panel.companion-bar .messages,
.floating-panel.companion-bar .status-card,
.floating-panel.companion-bar .chat-history,
.floating-panel.companion-bar .conversation-list {
  display: none !important;
}

.floating-panel.companion-bar .composer {
  width: 100% !important;
  height: 48px !important;
  min-height: 48px !important;
  max-height: 48px !important;
  padding: 0 34px 0 0 !important;
  margin: 0 !important;
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr) !important;
  gap: 7px !important;
  align-items: center !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

.floating-panel.companion-bar .composer-header-actions {
  position: static !important;
  grid-column: 1 !important;
  grid-row: 1 !important;
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
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
  border-radius: 999px !important;
}

.floating-panel.companion-bar .composer-input-wrap {
  grid-column: 2 !important;
  grid-row: 1 !important;
  height: 48px !important;
  min-height: 48px !important;
  max-height: 48px !important;
  overflow: hidden !important;
  border-radius: 16px !important;
  background: rgba(12, 18, 16, .48) !important;
  border: 1px solid rgba(180, 244, 200, .18) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.045) !important;
  backdrop-filter: blur(20px) saturate(1.25);
  -webkit-backdrop-filter: blur(20px) saturate(1.25);
  cursor: text;
}

.floating-panel.companion-bar .composer-input-wrap textarea {
  height: 48px !important;
  min-height: 48px !important;
  max-height: 48px !important;
  padding: 14px 82px 12px 14px !important;
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
  gap: 5px !important;
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
  cursor: grab;
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

function setToggleIcon(button: HTMLButtonElement, compact: boolean) {
  button.innerHTML = compact ? CHEVRON_UP_ICON : CHEVRON_DOWN_ICON;
  button.title = compact ? "Restore companion" : "Compact companion";
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "button, textarea, input, select, a, [role='button'], .composer-input-wrap, .input-inline-actions, .composer-header-actions, .companion-bar-toggle"
    )
  );
}

export function CompanionModeController() {
  useEffect(() => {
    function ensureStyle() {
      if (document.getElementById("companion-size-fix-css")) return;
      const style = document.createElement("style");
      style.id = "companion-size-fix-css";
      style.textContent = COMPANION_SIZE_FIX_CSS;
      document.head.appendChild(style);
    }

    async function resizeWindow(compact: boolean) {
      try {
        const win = getCurrentWindow();
        if (compact) {
          await win.setMinSize(COMPACT_MIN_SIZE);
          await win.setSize(COMPACT_SIZE);
          return;
        }
        await win.setMinSize(EXPANDED_MIN_SIZE);
        await win.setSize(EXPANDED_SIZE);
      } catch (error) {
        console.warn("Unable to resize companion window", error);
      }
    }

    function wireCompanion() {
      ensureStyle();
      const panel = document.querySelector<HTMLElement>(".floating-panel");
      const actions = document.querySelector<HTMLElement>(".floating-titlebar .titlebar-actions");
      if (!panel || !actions) return;

      let button = document.getElementById("companion-bar-toggle") as HTMLButtonElement | null;
      if (!button) {
        button = document.createElement("button");
        button.id = "companion-bar-toggle";
        button.type = "button";
        button.className = "companion-bar-toggle";
        button.setAttribute("aria-label", "Toggle compact companion");
        setToggleIcon(button, panel.classList.contains("companion-bar"));
        button.addEventListener("click", () => {
          const compact = panel.classList.toggle("companion-bar");
          setToggleIcon(button, compact);
          void resizeWindow(compact);
        });
        actions.prepend(button);
      } else {
        setToggleIcon(button, panel.classList.contains("companion-bar"));
      }

      if (!panel.dataset.companionDragWired) {
        panel.dataset.companionDragWired = "true";
        panel.addEventListener("pointerdown", (event) => {
          if (!panel.classList.contains("companion-bar")) return;
          if (event.button !== 0) return;
          if (isInteractiveTarget(event.target)) return;
          void getCurrentWindow().startDragging();
        });
      }
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
