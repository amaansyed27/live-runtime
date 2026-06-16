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
pub fn speak_text(text: String) -> Result<(), String> {
    crate::speech::speak(&text)
}

#[tauri::command]
pub fn stop_speech() -> Result<(), String> {
    crate::speech::stop()
}

#[tauri::command]
pub fn hide_to_tray(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn show_dashboard(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|error| error.to_string())?;
        window.unminimize().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
    }
    Ok(())
}
