use once_cell::sync::Lazy;
use serde::Deserialize;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

static CURRENT_SPEECH: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeechSettings {
    voice_name: Option<String>,
    rate: Option<f32>,
    pitch: Option<f32>,
    volume: Option<f32>,
}

pub fn engine_name() -> &'static str {
    if cfg!(target_os = "macos") {
        "macOS say"
    } else if cfg!(target_os = "windows") {
        "Windows System.Speech"
    } else {
        "Linux spd-say/espeak"
    }
}

pub fn speak(text: &str, settings: Option<SpeechSettings>) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    let _ = stop();
    let settings = settings.unwrap_or_default();

    #[cfg(target_os = "macos")]
    {
        let mut command = Command::new("say");
        if let Some(voice_name) = settings.clean_voice_name() {
            command.args(["-v", &voice_name]);
        }
        command.args(["-r", &settings.macos_words_per_minute().to_string()]);
        command.arg(text);
        return spawn_current(command);
    }

    #[cfg(target_os = "windows")]
    {
        let escaped_text = powershell_single_quote(text);
        let voice_script = settings
            .clean_voice_name()
            .map(|voice_name| {
                format!(
                    "$voice = '{}'; if ($s.GetInstalledVoices().VoiceInfo.Name -contains $voice) {{ $s.SelectVoice($voice) }}; ",
                    powershell_single_quote(&voice_name)
                )
            })
            .unwrap_or_default();
        let script = format!(
            "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = {}; $s.Volume = {}; {}$s.Speak('{}')",
            settings.windows_rate(),
            settings.windows_volume(),
            voice_script,
            escaped_text
        );
        let mut command = Command::new("powershell");
        command.args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script]);
        return spawn_current(command);
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let mut spd = Command::new("spd-say");
        spd.args(["-r", &settings.linux_spd_rate().to_string()]);
        spd.args(["-p", &settings.linux_spd_pitch().to_string()]);
        spd.args(["-i", &settings.linux_spd_volume().to_string()]);
        spd.arg(text);
        match spawn_current(spd) {
            Ok(()) => Ok(()),
            Err(_) => {
                let mut espeak = Command::new("espeak");
                espeak.args(["-s", &settings.espeak_words_per_minute().to_string()]);
                espeak.args(["-p", &settings.espeak_pitch().to_string()]);
                espeak.args(["-a", &settings.espeak_volume().to_string()]);
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

impl Default for SpeechSettings {
    fn default() -> Self {
        Self {
            voice_name: None,
            rate: Some(0.95),
            pitch: Some(1.0),
            volume: Some(1.0),
        }
    }
}

impl SpeechSettings {
    fn clean_voice_name(&self) -> Option<String> {
        self.voice_name
            .as_ref()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
    }

    fn rate(&self) -> f32 {
        clamp(self.rate.unwrap_or(0.95), 0.5, 1.5)
    }

    fn pitch(&self) -> f32 {
        clamp(self.pitch.unwrap_or(1.0), 0.5, 1.5)
    }

    fn volume(&self) -> f32 {
        clamp(self.volume.unwrap_or(1.0), 0.0, 1.0)
    }

    fn windows_rate(&self) -> i32 {
        ((self.rate() - 1.0) * 10.0).round().clamp(-10.0, 10.0) as i32
    }

    fn windows_volume(&self) -> i32 {
        (self.volume() * 100.0).round().clamp(0.0, 100.0) as i32
    }

    fn macos_words_per_minute(&self) -> i32 {
        (175.0 * self.rate()).round().clamp(90.0, 260.0) as i32
    }

    fn linux_spd_rate(&self) -> i32 {
        ((self.rate() - 1.0) * 100.0).round().clamp(-50.0, 50.0) as i32
    }

    fn linux_spd_pitch(&self) -> i32 {
        ((self.pitch() - 1.0) * 100.0).round().clamp(-50.0, 50.0) as i32
    }

    fn linux_spd_volume(&self) -> i32 {
        ((self.volume() - 0.5) * 200.0).round().clamp(-100.0, 100.0) as i32
    }

    fn espeak_words_per_minute(&self) -> i32 {
        (175.0 * self.rate()).round().clamp(90.0, 260.0) as i32
    }

    fn espeak_pitch(&self) -> i32 {
        (50.0 * self.pitch()).round().clamp(20.0, 90.0) as i32
    }

    fn espeak_volume(&self) -> i32 {
        (100.0 * self.volume()).round().clamp(0.0, 200.0) as i32
    }
}

fn powershell_single_quote(value: &str) -> String {
    value.replace(''', "''")
}

fn clamp(value: f32, min: f32, max: f32) -> f32 {
    value.min(max).max(min)
}
