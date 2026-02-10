use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;

#[derive(Debug, Serialize, Deserialize)]
struct Printer {
    name: String,
    status: String,
}

/// Convierte imagen base64 en bytes ESC/POS (GS v 0) para logo en térmica. Ancho 384 dots (48 bytes).
fn logo_to_escpos(base64_data: &str) -> Result<Vec<u8>, String> {
    let prefix = "data:image/";
    let bytes = if base64_data.starts_with(prefix) {
        let start = base64_data.find("base64,").ok_or("base64 invalido")? + 7;
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &base64_data[start..])
            .map_err(|e| format!("decode base64: {}", e))?
    } else {
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, base64_data.trim())
            .map_err(|e| format!("decode base64: {}", e))?
    };
    let img = image::load_from_memory(&bytes).map_err(|e| format!("cargar imagen: {}", e))?;
    let rgb = img.to_rgb8();
    const W: u32 = 384;
    const H: u32 = 64;
    let scaled = image::imageops::resize(
        &rgb,
        W,
        H,
        image::imageops::FilterType::Triangle,
    );
    let (w, h) = (scaled.width() as usize, scaled.height() as usize);
    let w_bytes = w / 8;
    let mut raster = Vec::with_capacity(8 + (w_bytes * (h / 8)));
    raster.extend_from_slice(&[0x1D, 0x76, 0x30, 0]); // GS v 0 m=0
    raster.push((w_bytes & 0xFF) as u8);
    raster.push((w_bytes >> 8) as u8);
    raster.push((h & 0xFF) as u8);
    raster.push((h >> 8) as u8);
    for row8 in 0..(h / 8) {
        for col_byte in 0..w_bytes {
            let mut byte: u8 = 0;
            for bit in 0..8 {
                let x = col_byte * 8 + bit;
                let y = row8 * 8;
                let p = scaled.get_pixel(x as u32, y as u32);
                let luma = (p[0] as u32 * 299 + p[1] as u32 * 587 + p[2] as u32 * 114) / 1000;
                if luma < 128 {
                    byte |= 1 << (7 - bit);
                }
            }
            raster.push(byte);
        }
    }
    Ok(raster)
}

/// Convierte imagen base64 en bytes ESC/POS (GS v 0) para etiqueta de código de barras. Ancho 384 dots.
fn barcode_image_to_escpos(base64_data: &str) -> Result<Vec<u8>, String> {
    let prefix = "data:image/";
    let bytes = if base64_data.starts_with(prefix) {
        let start = base64_data.find("base64,").ok_or("base64 invalido")? + 7;
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &base64_data[start..])
            .map_err(|e| format!("decode base64: {}", e))?
    } else {
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, base64_data.trim())
            .map_err(|e| format!("decode base64: {}", e))?
    };
    let img = image::load_from_memory(&bytes).map_err(|e| format!("cargar imagen: {}", e))?;
    let rgb = img.to_rgb8();
    const W: u32 = 384;
    const H: u32 = 64;
    let scaled = image::imageops::resize(
        &rgb,
        W,
        H,
        image::imageops::FilterType::Triangle,
    );
    let (w, h) = (scaled.width() as usize, scaled.height() as usize);
    let w_bytes = w / 8;
    let mut raster = Vec::with_capacity(8 + (w_bytes * (h / 8)));
    raster.extend_from_slice(&[0x1D, 0x76, 0x30, 0]);
    raster.push((w_bytes & 0xFF) as u8);
    raster.push((w_bytes >> 8) as u8);
    raster.push((h & 0xFF) as u8);
    raster.push((h >> 8) as u8);
    for row8 in 0..(h / 8) {
        for col_byte in 0..w_bytes {
            let mut byte: u8 = 0;
            for bit in 0..8 {
                let x = col_byte * 8 + bit;
                let y = row8 * 8;
                let p = scaled.get_pixel(x as u32, y as u32);
                let luma = (p[0] as u32 * 299 + p[1] as u32 * 587 + p[2] as u32 * 114) / 1000;
                if luma < 128 {
                    byte |= 1 << (7 - bit);
                }
            }
            raster.push(byte);
        }
    }
    Ok(raster)
}

#[derive(Debug, serde::Deserialize)]
struct BarcodeLabel {
    barcode_image_base64: Option<String>,
    barcode_value: Option<String>,
    product_name: String,
}

/// Envía comando nativo ESC/POS CODE128 (GS k m=73). Más fiable que raster en muchas térmicas.
fn escpos_code128(data: &str) -> Vec<u8> {
    let bytes = data.as_bytes();
    let n = bytes.len().min(255);
    let mut out = Vec::with_capacity(4 + n);
    out.extend_from_slice(&[0x1D, 0x6B, 73]); // GS k m=73 (CODE128)
    out.push(n as u8);
    out.extend_from_slice(&bytes[..n]);
    out
}

/// Print barcode labels to the same thermal printer as tickets.
#[tauri::command]
fn print_barcode_labels(printer_name: String, labels: Vec<BarcodeLabel>) -> Result<(), String> {
    use std::io::Write;
    log::info!("print_barcode_labels: {} labels, printer: {:?}", labels.len(), printer_name.trim());

    let mut to_send: Vec<u8> = Vec::new();
    to_send.extend_from_slice(&[0x1B, 0x40]); // ESC @ init

    for label in &labels {
        let name_bytes = label.product_name.as_bytes();
        let used_native = if let Some(ref code) = label.barcode_value {
            if !code.is_empty() {
                to_send.extend_from_slice(&[0x1D, 0x68, 0x40]); // GS h 64 (altura barras, dots)
                to_send.extend_from_slice(&[0x1D, 0x77, 0x02]); // GS w 2 (ancho módulo)
                to_send.extend(escpos_code128(code));
                to_send.push(b'\n');
                true
            } else {
                false
            }
        } else {
            false
        };

        if !used_native {
            if let Some(ref img) = label.barcode_image_base64 {
                if !img.is_empty() {
                    if let Ok(escpos) = barcode_image_to_escpos(img) {
                        to_send.extend_from_slice(&escpos);
                    }
                }
            }
        }
        to_send.extend_from_slice(name_bytes);
        to_send.push(b'\n');
        to_send.extend_from_slice(&[0x1B, 0x64, 0x03]); // ESC d 3 (feed 3 lines)
    }
    to_send.extend_from_slice(&[0x1D, 0x56, 0x00]); // GS V 0 (corte parcial)

    // Intentar USB directo primero
    if let Ok(()) = try_usb_direct(&to_send) {
        log::info!("print_barcode_labels: USB direct OK");
        return Ok(());
    }
    log::warn!("print_barcode_labels: USB direct failed, fallback to lp/spooler");

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let temp_dir = std::env::temp_dir();
        let file_name = format!(
            "pos_barcodes_{}.bin",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        );
        let path = temp_dir.join(&file_name);
        let mut file = File::create(&path).map_err(|e| format!("Failed to create temp file: {}", e))?;
        file.write_all(&to_send).map_err(|e| format!("Failed to write barcodes: {}", e))?;
        file.sync_all().map_err(|e| format!("Failed to sync file: {}", e))?;
        drop(file);
        let path_str = path.to_string_lossy();
        let mut cmd = Command::new("lp");
        if !printer_name.trim().is_empty() {
            cmd.arg("-d").arg(printer_name.trim());
        }
        let status = cmd
            .args(["-o", "raw", "-o", "document-format=application/octet-stream", path_str.as_ref()])
            .status();
        std::fs::remove_file(&path).ok();
        let exit_status = status.map_err(|e| format!("lp failed: {}", e))?;
        if !exit_status.success() {
            return Err("No se pudo imprimir. En macOS agregue la impresora como Raw en http://localhost:631.".to_string());
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::io::Write;
        use std::process::{Command, Stdio};
        let mut cmd = Command::new("lp");
        if !printer_name.trim().is_empty() {
            cmd.arg("-d").arg(printer_name.trim());
        }
        let mut child = cmd
            .args(["-o", "raw"])
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| format!("lp spawn: {}", e))?;
        if let Some(ref mut stdin) = child.stdin {
            stdin.write_all(&to_send).map_err(|e| format!("lp stdin: {}", e))?;
        }
        drop(child.stdin.take());
        let exit_status = child.wait().map_err(|e| format!("lp wait: {}", e))?;
        if !exit_status.success() {
            return Err("No se pudo imprimir. Revisa la impresora en Configuración.".to_string());
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let temp_dir = std::env::temp_dir();
        let file_name = format!(
            "pos_barcodes_{}.txt",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        );
        let path = temp_dir.join(&file_name);
        let mut file = File::create(&path).map_err(|e| format!("Failed to create temp file: {}", e))?;
        file.write_all(&to_send).map_err(|e| format!("Failed to write barcodes: {}", e))?;
        file.sync_all().map_err(|e| format!("Failed to sync file: {}", e))?;
        drop(file);
        let path_str = path.to_string_lossy();
        let script = if printer_name.trim().is_empty() {
            format!("Get-Content -Path '{}' -Raw | Out-Printer", path_str)
        } else {
            let name = printer_name.trim().replace('\'', "''");
            format!("Get-Content -Path '{}' -Raw | Out-Printer -Name '{}'", path_str, name)
        };
        let status = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .status();
        std::fs::remove_file(&path).ok();
        let exit_status = status.map_err(|e| format!("PowerShell print failed: {}", e))?;
        if !exit_status.success() {
            return Err("Error al imprimir.".to_string());
        }
    }

    log::info!("print_barcode_labels completed");
    Ok(())
}

/// Print ticket to the given printer (or default if name is empty). Optional logo as base64 data URL.
#[tauri::command]
fn print_ticket(
    printer_name: String,
    ticket_text: String,
    ticket_logo_base64: Option<String>,
) -> Result<(), String> {
    log::info!(
        "print_ticket called, printer: {:?}, text length: {}, logo: {}",
        printer_name,
        ticket_text.len(),
        ticket_logo_base64.as_ref().map(|s| s.len()).unwrap_or(0)
    );

    let mut to_send: Vec<u8> = Vec::new();
    // Inicializar impresora (ESC @) para estado conocido antes de logo/texto
    to_send.extend_from_slice(&[0x1B, 0x40]);
    if let Some(ref logo) = ticket_logo_base64 {
        if !logo.is_empty() {
            match logo_to_escpos(logo) {
                Ok(escpos) => {
                    to_send.extend_from_slice(&escpos);
                    log::info!("print_ticket: logo ESC/POS {} bytes", escpos.len());
                }
                Err(e) => {
                    log::warn!("print_ticket: logo fallo {}, se imprime solo texto", e);
                }
            }
        }
    }
    to_send.extend_from_slice(&to_ascii_thermal(&ticket_text));
    to_send.extend_from_slice(&[0x1B, 0x64, 0x05]); // ESC d 5 (feed)
    to_send.extend_from_slice(&[0x1D, 0x56, 0x00]); // GS V 0 (corte parcial)

    // Intentar USB directo primero (macOS /dev/cu.*, Windows/Linux rusb)
    if let Ok(()) = try_usb_direct(&to_send) {
        log::info!("print_ticket: USB direct OK");
        return Ok(());
    }
    log::warn!("print_ticket: USB direct failed, fallback to lp/spooler");

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let temp_dir = std::env::temp_dir();
        let file_name = format!(
            "pos_ticket_{}.bin",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        );
        let path = temp_dir.join(&file_name);
        let mut file = File::create(&path).map_err(|e| format!("Failed to create temp file: {}", e))?;
        file.write_all(&to_send).map_err(|e| format!("Failed to write ticket: {}", e))?;
        file.sync_all().map_err(|e| format!("Failed to sync file: {}", e))?;
        drop(file);
        let path_str = path.to_string_lossy();
        let mut cmd = Command::new("lp");
        if !printer_name.trim().is_empty() {
            cmd.arg("-d").arg(printer_name.trim());
        }
        let status = cmd
            .args(["-o", "raw", "-o", "document-format=application/octet-stream", path_str.as_ref()])
            .status();
        std::fs::remove_file(&path).ok();
        let exit_status = status.map_err(|e| format!("lp failed: {}", e))?;
        if !exit_status.success() {
            return Err("No se pudo imprimir. En macOS agregue la impresora como Raw en http://localhost:631 (Administration > Add Printer > USB > Make: Raw).".to_string());
        }
        log::info!("print_ticket: lp -o raw (file .bin) completed");
    }

    #[cfg(target_os = "linux")]
    {
        use std::io::Write;
        use std::process::{Command, Stdio};
        let mut cmd = Command::new("lp");
        if !printer_name.trim().is_empty() {
            cmd.arg("-d").arg(printer_name.trim());
        }
        let mut child = cmd
            .args(["-o", "raw"])
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| format!("lp spawn: {}", e))?;
        if let Some(ref mut stdin) = child.stdin {
            stdin.write_all(&to_send).map_err(|e| format!("lp stdin: {}", e))?;
        }
        drop(child.stdin.take());
        let exit_status = child.wait().map_err(|e| format!("lp wait: {}", e))?;
        if !exit_status.success() {
            return Err("No se pudo imprimir. En Ajustes del sistema → Impresoras, revisa que la impresora esté “Aceptando trabajos” y que uses controlador Genérico o Raw si está disponible.".to_string());
        }
        log::info!("print_ticket: lp -o raw (stdin) completed");
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let temp_dir = std::env::temp_dir();
        let file_name = format!(
            "pos_ticket_{}.txt",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        );
        let path = temp_dir.join(&file_name);
        let mut file = File::create(&path).map_err(|e| format!("Failed to create temp file: {}", e))?;
        file.write_all(&to_send).map_err(|e| format!("Failed to write ticket: {}", e))?;
        file.sync_all().map_err(|e| format!("Failed to sync file: {}", e))?;
        drop(file);
        let path_str = path.to_string_lossy();
        let script = if printer_name.trim().is_empty() {
            format!("Get-Content -Path '{}' -Raw | Out-Printer", path_str)
        } else {
            let name = printer_name.trim().replace('\'', "''");
            format!("Get-Content -Path '{}' -Raw | Out-Printer -Name '{}'", path_str, name)
        };
        let status = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .status();
        std::fs::remove_file(&path).ok();
        let exit_status = status.map_err(|e| format!("Failed to run PowerShell: {}", e))?;
        if !exit_status.success() {
            return Err("PowerShell print command failed".to_string());
        }
    }

    log::info!("print_ticket completed");
    Ok(())
}

#[tauri::command]
fn get_printers() -> Result<Vec<Printer>, String> {
    let mut printers = Vec::new();
    
    log::info!("get_printers() called");
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        // Windows: Use PowerShell to get printers
        let output = Command::new("powershell")
            .args([
                "-Command",
                "Get-Printer | Select-Object Name, PrinterStatus | ConvertTo-Json -Compress"
            ])
            .output();
            
        if let Ok(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            
            // Try to parse JSON first
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(array) = json.as_array() {
                    for item in array {
                        if let Some(name) = item.get("Name").and_then(|n| n.as_str()) {
                            printers.push(Printer {
                                name: name.to_string(),
                                status: "available".to_string(),
                            });
                        }
                    }
                } else if let Some(name) = json.get("Name").and_then(|n| n.as_str()) {
                    // Single printer
                    printers.push(Printer {
                        name: name.to_string(),
                        status: "available".to_string(),
                    });
                }
            } else {
                // Fallback: parse line by line
                for line in stdout.lines() {
                    let trimmed = line.trim();
                    if !trimmed.is_empty() && !trimmed.starts_with('{') && !trimmed.starts_with('[') {
                        printers.push(Printer {
                            name: trimmed.to_string(),
                            status: "available".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        log::info!("Detecting printers on macOS...");
        
        // macOS: Try multiple methods
        // Method 1: lpstat -a (list all printers)
        match Command::new("lpstat").arg("-a").output() {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                log::info!("lpstat -a output: {}", stdout);
                
                for line in stdout.lines() {
                    // Format: "printer_name accepting requests since..."
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if !parts.is_empty() {
                        let name = parts[0].to_string();
                        if !name.is_empty() {
                            log::info!("Found printer: {}", name);
                            printers.push(Printer {
                                name,
                                status: "available".to_string(),
                            });
                        }
                    }
                }
            }
            Err(e) => {
                log::warn!("lpstat -a failed: {}", e);
            }
        }
        
        // Method 2: If lpstat -a fails, try lpstat -p
        if printers.is_empty() {
            match Command::new("lpstat").arg("-p").output() {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    log::info!("lpstat -p output: {}", stdout);
                    
                    for line in stdout.lines() {
                        if line.starts_with("printer ") {
                            let parts: Vec<&str> = line.split_whitespace().collect();
                            if parts.len() > 1 {
                                let name = parts[1].to_string();
                                log::info!("Found printer: {}", name);
                                printers.push(Printer {
                                    name,
                                    status: "available".to_string(),
                                });
                            }
                        }
                    }
                }
                Err(e) => {
                    log::warn!("lpstat -p failed: {}", e);
                }
            }
        }
        
        // Method 3: Try system_profiler as last resort
        if printers.is_empty() {
            match Command::new("system_profiler").args(["SPPrintersDataType"]).output() {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    log::info!("system_profiler output length: {}", stdout.len());
                    
                    for line in stdout.lines() {
                        // Look for "Name: printer_name"
                        if line.trim().starts_with("Name:") {
                            let parts: Vec<&str> = line.split(':').collect();
                            if parts.len() > 1 {
                                let name = parts[1].trim().to_string();
                                if !name.is_empty() {
                                    log::info!("Found printer: {}", name);
                                    printers.push(Printer {
                                        name,
                                        status: "available".to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    log::warn!("system_profiler failed: {}", e);
                }
            }
        }
        
        log::info!("Total printers found: {}", printers.len());
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        
        // Linux: Use lpstat (CUPS)
        let output = Command::new("lpstat")
            .arg("-p")
            .output();
            
        if let Ok(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.starts_with("printer ") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() > 1 {
                        printers.push(Printer {
                            name: parts[1].to_string(),
                            status: "available".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    log::info!("Returning {} printers", printers.len());
    Ok(printers)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![get_printers, print_ticket, print_barcode_labels])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
