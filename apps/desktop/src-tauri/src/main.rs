#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod memory;
mod runtime;
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
            runtime::runtime_status,
            runtime::speak_text,
            runtime::stop_speech,
            runtime::hide_to_tray,
            runtime::show_dashboard,
            runtime::show_companion,
            runtime::hide_companion,
            runtime::toggle_companion,
            memory::memory_status,
            memory::save_memory,
            memory::list_memories,
            memory::clear_memory
        ])
        .run(tauri::generate_context!())
        .expect("error while running Live Runtime");
}
