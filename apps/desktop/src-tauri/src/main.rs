#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod speech;
mod tray;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            tray::setup(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::runtime_status,
            commands::speak_text,
            commands::stop_speech,
            commands::hide_to_tray,
            commands::show_dashboard,
            commands::show_companion,
            commands::hide_companion,
            commands::toggle_companion,
            commands::perform_desktop_action
        ])
        .on_window_event(|window, event| {
            if matches!(window.label(), "main" | "companion") {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Live Runtime");
}
