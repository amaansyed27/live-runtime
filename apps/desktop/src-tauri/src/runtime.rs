use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    platform: String,
    arch: String,
    speech_output: String,
    tray_enabled: bool,
}

#[tauri::command]
pub fn runtime_status() -> RuntimeStatus {
    RuntimeStatus {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        speech_output: crate::speech::engine_name().to_string(),
        tray_enabled: true,
    }
}

#[tauri::command]
pub fn speak_text(text: String, settings: Option<crate::speech::SpeechSettings>) -> Result<(), String> {
    crate::speech::speak(&text, settings)
}

#[tauri::command]
pub fn stop_speech() -> Result<(), String> {
    crate::speech::stop()
}

#[tauri::command]
pub fn hide_to_tray(app: AppHandle) -> Result<(), String> {
    set_window_visible(&app, "main", false)
}

#[tauri::command]
pub fn show_dashboard(app: AppHandle) -> Result<(), String> {
    set_window_visible(&app, "main", true)
}

#[tauri::command]
pub fn show_companion(app: AppHandle) -> Result<(), String> {
    set_window_visible(&app, "companion", true)
}

#[tauri::command]
pub fn hide_companion(app: AppHandle) -> Result<(), String> {
    set_window_visible(&app, "companion", false)
}

#[tauri::command]
pub fn toggle_companion(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("companion") {
        let visible = window.is_visible().map_err(|error| error.to_string())?;
        if visible {
            window.hide().map_err(|error| error.to_string())?;
        } else {
            window.show().map_err(|error| error.to_string())?;
            window.unminimize().map_err(|error| error.to_string())?;
            window.set_focus().map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn set_window_visible(app: &AppHandle, label: &str, visible: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(label) {
        if visible {
            window.show().map_err(|error| error.to_string())?;
            window.unminimize().map_err(|error| error.to_string())?;
            window.set_focus().map_err(|error| error.to_string())?;
        } else {
            window.hide().map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}
