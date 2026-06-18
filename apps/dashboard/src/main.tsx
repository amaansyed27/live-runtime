import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SettingsResetInjector as SettingsDataPanel } from "./components/SettingsResetInjector";
import "./styles.css";
import "./scrollbars.css";
import "./skills.css";
import "./alpha-polish.css";
import "./components/companion-window.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <SettingsDataPanel />
  </React.StrictMode>
);
