use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    platform: String,
    arch: String,
    speech_output: String,
    tray_enabled: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopAction {
    kind: String,
    value: String,
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
    hide_window(&app, "main")
}

#[tauri::command]
pub fn show_dashboard(app: AppHandle) -> Result<(), String> {
    show_window(&app, "main")
}

#[tauri::command]
pub fn show_companion(app: AppHandle) -> Result<(), String> {
    show_window(&app, "companion")
}

#[tauri::command]
pub fn hide_companion(app: AppHandle) -> Result<(), String> {
    hide_window(&app, "companion")
}

#[tauri::command]
pub fn toggle_companion(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("companion") {
        if window.is_visible().map_err(|error| error.to_string())? {
            window.hide().map_err(|error| error.to_string())?;
        } else {
            show_window(&app, "companion")?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_companion_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    register_companion_shortcut(app, shortcut)
}

#[tauri::command]
pub fn perform_desktop_action(action: DesktopAction) -> Result<(), String> {
    match action.kind.as_str() {
        "openApp" => open_app(&action.value),
        "openUrl" => open_url(&action.value),
        "searchWeb" => open_url(&format!("https://www.google.com/search?q={}", encode_query(&action.value))),
        "playMusic" => open_url(&format!("https://music.youtube.com/search?q={}", encode_query(&action.value))),
        _ => Err("Unsupported desktop action".to_string()),
    }
}

pub fn register_companion_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    let parsed = parse_shortcut(&shortcut)?;
    app.global_shortcut()
        .unregister_all()
        .map_err(|error| error.to_string())?;
    app.global_shortcut()
        .register(parsed)
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn show_window(app: &AppHandle, label: &str) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(label) {
        window.show().map_err(|error| error.to_string())?;
        window.unminimize().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        if label == "companion" {
            let _ = window.set_always_on_top(true);
        }
    }
    Ok(())
}

fn hide_window(app: &AppHandle, label: &str) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(label) {
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn parse_shortcut(value: &str) -> Result<Shortcut, String> {
    let mut modifiers = Modifiers::empty();
    let mut key: Option<Code> = None;

    for part in value.split('+').map(|item| item.trim()).filter(|item| !item.is_empty()) {
        match part.to_ascii_lowercase().as_str() {
            "ctrl" | "control" => modifiers.insert(Modifiers::CONTROL),
            "cmd" | "command" | "super" | "meta" => modifiers.insert(Modifiers::SUPER),
            "commandorcontrol" | "cmdorctrl" => {
                if cfg!(target_os = "macos") {
                    modifiers.insert(Modifiers::SUPER);
                } else {
                    modifiers.insert(Modifiers::CONTROL);
                }
            }
            "shift" => modifiers.insert(Modifiers::SHIFT),
            "alt" | "option" => modifiers.insert(Modifiers::ALT),
            "space" => key = Some(Code::Space),
            "enter" => key = Some(Code::Enter),
            "escape" | "esc" => key = Some(Code::Escape),
            letter if letter.len() == 1 => {
                key = match letter.chars().next().unwrap().to_ascii_uppercase() {
                    'A' => Some(Code::KeyA),
                    'B' => Some(Code::KeyB),
                    'C' => Some(Code::KeyC),
                    'D' => Some(Code::KeyD),
                    'E' => Some(Code::KeyE),
                    'F' => Some(Code::KeyF),
                    'G' => Some(Code::KeyG),
                    'H' => Some(Code::KeyH),
                    'I' => Some(Code::KeyI),
                    'J' => Some(Code::KeyJ),
                    'K' => Some(Code::KeyK),
                    'L' => Some(Code::KeyL),
                    'M' => Some(Code::KeyM),
                    'N' => Some(Code::KeyN),
                    'O' => Some(Code::KeyO),
                    'P' => Some(Code::KeyP),
                    'Q' => Some(Code::KeyQ),
                    'R' => Some(Code::KeyR),
                    'S' => Some(Code::KeyS),
                    'T' => Some(Code::KeyT),
                    'U' => Some(Code::KeyU),
                    'V' => Some(Code::KeyV),
                    'W' => Some(Code::KeyW),
                    'X' => Some(Code::KeyX),
                    'Y' => Some(Code::KeyY),
                    'Z' => Some(Code::KeyZ),
                    _ => None,
                };
            }
            _ => return Err(format!("Unsupported shortcut part: {part}")),
        }
    }

    let code = key.ok_or_else(|| "Shortcut must include a key".to_string())?;
    let modifiers = if modifiers.is_empty() { None } else { Some(modifiers) };
    Ok(Shortcut::new(modifiers, code))
}

fn open_app(app_name: &str) -> Result<(), String> {
    let normalized = app_name.trim().to_ascii_lowercase();
    let target = match normalized.as_str() {
        "chrome" | "google chrome" => platform_app_name("chrome", "Google Chrome", "google-chrome"),
        "edge" | "microsoft edge" => platform_app_name("msedge", "Microsoft Edge", "microsoft-edge"),
        "notion" => platform_app_name("notion", "Notion", "notion"),
        "spotify" | "music" => platform_app_name("spotify", "Spotify", "spotify"),
        _ => return Err("Allowed apps for now: Chrome, Edge, Notion, Spotify".to_string()),
    };

    launch_target(&target)
}

fn open_url(url: &str) -> Result<(), String> {
    launch_target(url)
}

fn platform_app_name(windows: &str, macos: &str, linux: &str) -> String {
    if cfg!(target_os = "macos") {
        macos.to_string()
    } else if cfg!(target_os = "windows") {
        windows.to_string()
    } else {
        linux.to_string()
    }
}

fn launch_target(target: &str) -> Result<(), String> {
    let mut command = if cfg!(target_os = "macos") {
        let mut command = Command::new("open");
        command.arg(target);
        command
    } else if cfg!(target_os = "windows") {
        let mut command = Command::new("cmd");
        command.args(["/C", "start", "", target]);
        command
    } else {
        let mut command = Command::new("xdg-open");
        command.arg(target);
        command
    };

    command.spawn().map_err(|error| error.to_string())?;
    Ok(())
}

fn encode_query(value: &str) -> String {
    value
        .trim()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("+")
}
