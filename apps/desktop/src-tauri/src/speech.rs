use once_cell::sync::Lazy;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

static CURRENT_SPEECH: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));

pub fn engine_name() -> &'static str {
    if cfg!(target_os = "macos") {
        "macOS say"
    } else if cfg!(target_os = "windows") {
        "Windows System.Speech"
    } else {
        "Linux spd-say/espeak"
    }
}

pub fn speak(text: &str) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    let _ = stop();

    #[cfg(target_os = "macos")]
    {
        let mut command = Command::new("say");
        command.arg(text);
        return spawn_current(command);
    }

    #[cfg(target_os = "windows")]
    {
        let escaped = text.replace(''\'', "''");
        let script = format!(
            "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('{}')",
            escaped
        );
        let mut command = Command::new("powershell");
        command.args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script]);
        return spawn_current(command);
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let mut spd = Command::new("spd-say");
        spd.arg(text);
        match spawn_current(spd) {
            Ok(()) => Ok(()),
            Err(_) => {
                let mut espeak = Command::new("espeak");
                espeak.arg(text);
                spawn_current(espeak)
            }
        }
    }
}

pub fn stop() -> Result<(), String> {
    let mut guard = CURRENT_SPEECH
        .lock()
        .map_err(|_| "Speech process lock is poisoned".to_string())?;

    if let Some(child) = guard.as_mut() {
        let _ = child.kill();
    }
    *guard = None;
    Ok(())
}

fn spawn_current(mut command: Command) -> Result<(), String> {
    let child = command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Unable to start speech engine: {error}"))?;

    let mut guard = CURRENT_SPEECH
        .lock()
        .map_err(|_| "Speech process lock is poisoned".to_string())?;
    *guard = Some(child);
    Ok(())
}
