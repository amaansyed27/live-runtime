import { useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

const COMPACT_SIZE = new LogicalSize(390, 64);
const EXPANDED_SIZE = new LogicalSize(340, 410);
const COMPACT_MIN_SIZE = new LogicalSize(340, 64);
const EXPANDED_MIN_SIZE = new LogicalSize(300, 92);

const CHEVRON_DOWN_ICON = `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
const CHEVRON_UP_ICON = `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5.5 12.5 10 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>`;

const COMPANION_DOCK_CSS = `
.companion-window,
.companion-window * {
  -webkit-app-region: no-drag;
}

.companion-window .floating-titlebar,
.companion-window .titlebar-actions,
.companion-window .titlebar-actions button,
.companion-window .floating-body,
.companion-window .composer,
.companion-window .composer button,
.companion-window textarea {
  pointer-events: auto !important;
}

.companion-window .companion-bar-toggle {
  display: grid !important;
  place-items: center !important;
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  padding: 0 !important;
  border-radius: 999px !important;
  border: 1px solid rgba(185, 237, 206, .24) !important;
  color: rgba(232, 247, 236, .95) !important;
  background: rgba(12, 19, 17, .68) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 10px 24px rgba(0,0,0,.18) !important;
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
}

.companion-window .companion-bar-toggle svg {
  width: 16px !important;
  height: 16px !important;
  display: block !important;
}

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
}

.floating-panel.companion-bar .floating-titlebar {
  position: absolute !important;
  inset: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  pointer-events: none !important;
  z-index: 60;
}

.floating-panel.companion-bar .floating-titlebar .titlebar-actions {
  position: absolute !important;
  top: 5px !important;
  right: 5px !important;
  pointer-events: auto !important;
  z-index: 70;
}

.floating-panel.companion-bar .floating-titlebar .titlebar-actions > button:not(.companion-bar-toggle) {
  display: none !important;
}

.floating-panel.companion-bar .floating-body {
  width: 100% !important;
  height: 64px !important;
  min-height: 64px !important;
  max-height: 64px !important;
  padding: 8px 8px 8px 38px !important;
  margin: 0 !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

.floating-panel.companion-bar .mini-status,
.floating-panel.companion-bar .mini-conversation {
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
  align-items: center !important;
  gap: 7px !important;
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
  backdrop-filter: blur(20px) saturate(1.25);
  -webkit-backdrop-filter: blur(20px) saturate(1.25);
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

.companion-drag-grip {
  display: none;
}

.floating-panel.companion-bar .companion-drag-grip {
  display: flex;
  position: absolute;
  left: 7px;
  top: 8px;
  bottom: 8px;
  width: 24px;
  z-index: 80;
  cursor: grab;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(185, 237, 206, .16);
  background: rgba(12, 19, 17, .42);
}

.floating-panel.companion-bar .companion-drag-grip::before {
  content: "";
  width: 3px;
  height: 18px;
  border-radius: 999px;
  background: currentColor;
  color: rgba(232, 247, 236, .55);
  box-shadow: 6px 0 0 currentColor;
  transform: translateX(-3px);
}

.floating-panel.companion-bar .companion-drag-grip:active {
  cursor: grabbing;
}
`;

function setToggleIcon(button: HTMLButtonElement, compact: boolean) {
  button.id = "companion-bar-toggle";
  button.classList.add("companion-bar-toggle");
  button.innerHTML = compact ? CHEVRON_UP_ICON : CHEVRON_DOWN_ICON;
  button.title = compact ? "Restore companion" : "Compact companion";
  button.setAttribute("aria-label", compact ? "Restore companion" : "Compact companion");
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, textarea, input, select, a, [role='button'], .titlebar-actions, .composer-input-wrap, .input-inline-actions, .composer-header-actions"));
}

function clearNativeDragRegions(panel: HTMLElement) {
  panel.querySelectorAll<HTMLElement>("[data-tauri-drag-region]").forEach((element) => {
    element.removeAttribute("data-tauri-drag-region");
  });
}

function startCompanionDrag() {
  void getCurrentWindow().startDragging().catch((error) => {
    console.warn("Unable to drag companion window", error);
  });
}

export function CompanionModeController() {
  useEffect(() => {
    let compact = false;

    function ensureStyle() {
      if (document.getElementById("companion-dock-css")) return;
      const style = document.createElement("style");
      style.id = "companion-dock-css";
      style.textContent = COMPANION_DOCK_CSS;
      document.head.appendChild(style);
    }

    async function resizeWindow(nextCompact: boolean) {
      try {
        const win = getCurrentWindow();
        if (nextCompact) {
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

    function toggle(panel: HTMLElement, button: HTMLButtonElement) {
      compact = !panel.classList.contains("companion-bar");
      panel.classList.toggle("companion-bar", compact);
      setToggleIcon(button, compact);
      clearNativeDragRegions(panel);
      void resizeWindow(compact);
    }

    function wireCompanion() {
      ensureStyle();
      const panel = document.querySelector<HTMLElement>(".floating-panel.companion-window");
      const titlebar = document.querySelector<HTMLElement>(".floating-titlebar");
      const actions = document.querySelector<HTMLElement>(".floating-titlebar .titlebar-actions");
      if (!panel || !titlebar || !actions) return;

      clearNativeDragRegions(panel);

      let button = actions.querySelector<HTMLButtonElement>(".companion-bar-toggle");
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        actions.prepend(button);
      }

      setToggleIcon(button, panel.classList.contains("companion-bar"));
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        toggle(panel, button);
      };

      if (!titlebar.dataset.companionTitleDragWired) {
        titlebar.dataset.companionTitleDragWired = "true";
        titlebar.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          if (isInteractiveTarget(event.target)) return;
          startCompanionDrag();
        });
      }

      let grip = panel.querySelector<HTMLDivElement>(".companion-drag-grip");
      if (!grip) {
        grip = document.createElement("div");
        grip.className = "companion-drag-grip";
        grip.title = "Drag companion";
        grip.setAttribute("aria-label", "Drag companion");
        panel.prepend(grip);
      }

      if (!grip.dataset.companionDragWired) {
        grip.dataset.companionDragWired = "true";
        grip.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          startCompanionDrag();
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
