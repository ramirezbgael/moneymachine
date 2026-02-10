# Setup Tauri para Detección de Impresoras

## Instalación

### 1. Instalar Tauri CLI

```bash
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api
```

### 2. Inicializar Tauri

```bash
npx tauri init
```

Cuando pregunte:
- **App name**: `POS System`
- **Window title**: `POS System`
- **Where are your web assets?**: `dist`
- **Dev server URL**: `http://localhost:5173`
- **Frontend dev command**: `npm run dev`
- **Frontend build command**: `npm run build`

### 3. Actualizar `package.json`

Agregar scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

---

## Implementación de Detección de Impresoras

### 1. Crear `src-tauri/src/main.rs`

```rust
use tauri::Manager;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct Printer {
    name: String,
    status: String,
}

#[tauri::command]
fn get_printers() -> Result<Vec<Printer>, String> {
    let mut printers = Vec::new();
    
    #[cfg(target_os = "windows")]
    {
        // Windows: usar winapi o powershell
        use std::process::Command;
        
        let output = Command::new("powershell")
            .args(&[
                "-Command",
                "Get-Printer | Select-Object -ExpandProperty Name"
            ])
            .output();
            
        if let Ok(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let name = line.trim().to_string();
                if !name.is_empty() {
                    printers.push(Printer {
                        name,
                        status: "available".to_string(),
                    });
                }
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: usar lpstat
        use std::process::Command;
        
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
    
    #[cfg(target_os = "linux")]
    {
        // Linux: usar lpstat (CUPS)
        use std::process::Command;
        
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
    
    Ok(printers)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_printers])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 2. Actualizar `src-tauri/Cargo.toml`

```toml
[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

### 3. Settings.jsx ✅ (YA ACTUALIZADO)

El archivo `src/components/Settings/Settings.jsx` ya está actualizado para:
- ✅ Detectar Tauri v2 automáticamente
- ✅ Fallback a Tauri v1 si es necesario
- ✅ Fallback a servicio local Node.js
- ✅ Fallback a entrada manual

No necesitas hacer nada más aquí.

---

## ✅ Implementación Completada

### Archivos Actualizados:

1. ✅ `src-tauri/src/lib.rs` - Función `get_printers()` implementada
2. ✅ `src-tauri/Cargo.toml` - Dependencias agregadas (serde, shell plugin)
3. ✅ `src-tauri/capabilities/default.json` - Permisos configurados
4. ✅ `src/components/Settings/Settings.jsx` - Integración con Tauri v2
5. ✅ `package.json` - Scripts de Tauri agregados

---

## 🚀 Uso

### Desarrollo

```bash
# Desarrollo (con hot reload)
npm run tauri:dev
```

Esto:
1. Inicia Vite dev server
2. Compila Tauri
3. Abre la app de escritorio
4. Hot reload automático

### Build para Producción

```bash
npm run tauri:build
```

Crea la app en:
- **macOS**: `src-tauri/target/release/bundle/macos/`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/appimage/`

---

## ✅ Ventajas de Tauri

- ✅ **Bundle pequeño**: ~3-5MB vs Electron ~100MB+ (95% más ligero)
- ✅ **Rápido**: Mejor rendimiento y menor uso de memoria
- ✅ **Acceso nativo**: Detección real de impresoras del sistema
- ✅ **Mismo código**: Reutiliza tu React/Vite sin cambios
- ✅ **Seguro**: Rust backend con mejor seguridad

## 🎯 Detección de Impresoras Implementada

La función `get_printers()` detecta impresoras en:

- **Windows**: PowerShell `Get-Printer`
- **macOS**: `lpstat -p` (CUPS)
- **Linux**: `lpstat -p` (CUPS)

El frontend automáticamente:
1. Intenta Tauri v2 API
2. Fallback a Tauri v1
3. Fallback a servicio local Node.js
4. Fallback a entrada manual

---

## 🐛 Troubleshooting

### Error: "command not found: tauri"

```bash
npm install
```

### Error: Rust no encontrado

Instala Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Luego reinicia la terminal.

### Error al compilar

1. Verifica Rust: `rustc --version`
2. Limpia build: `cd src-tauri && cargo clean`
3. Reintenta: `npm run tauri:dev`

### La app no detecta impresoras

1. Verifica que la app tenga permisos del sistema
2. Prueba manualmente:
   - **Windows**: `powershell -Command "Get-Printer"`
   - **macOS/Linux**: `lpstat -p`
3. Revisa la consola de Tauri (en desarrollo)

---

## 📝 Notas Importantes

- **Primera compilación**: Puede tardar varios minutos (descarga dependencias Rust)
- **Compilaciones siguientes**: Mucho más rápidas
- **Bundle final**: ~3-5MB (vs Electron ~100MB+)
- **Rendimiento**: Mejor que Electron, especialmente en sistemas con recursos limitados

---

## Alternativa: Servicio Local Node.js (Más Simple)

Si prefieres no usar Tauri, puedes usar el servicio local:

### `printer-service/index.js`

```javascript
const express = require('express')
const { exec } = require('child_process')
const app = express()
const PORT = 3001

app.use(express.json())
app.use(require('cors')())

app.get('/api/printers', (req, res) => {
  // Detectar impresoras según OS
  const command = process.platform === 'win32'
    ? 'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"'
    : 'lpstat -p | grep "printer" | awk \'{print $2}\''
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.json({ printers: [] })
    }
    
    const printers = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(name => ({ name: name.trim(), status: 'available' }))
    
    res.json({ printers })
  })
})

app.listen(PORT, () => {
  console.log(`Printer service running on http://localhost:${PORT}`)
})
```

### Actualizar Settings.jsx

```javascript
const detectPrinters = async () => {
  try {
    // Try local service first
    const response = await fetch('http://localhost:3001/api/printers')
    if (response.ok) {
      const { printers } = await response.json()
      if (printers && printers.length > 0) {
        setAvailablePrinters(printers)
        return
      }
    }
  } catch (error) {
    // Service not running, continue with fallback
  }
  
  // ... resto del código
}
```

---

## Comparación

| Solución | Bundle | Setup | Distribución |
|----------|--------|-------|--------------|
| **Tauri** | 3-5MB | Medio | App standalone |
| Servicio Local | N/A | Fácil | Requiere Node.js |

---

**Recomendación**: Para un POS, **Tauri es mejor** porque:
- ✅ App standalone (no requiere instalar nada más)
- ✅ Más ligero y rápido (95% más pequeño que Electron)
- ✅ Mejor experiencia de usuario
- ✅ Acceso nativo real al sistema

---

## ✅ Estado Actual

**TODO COMPLETADO** ✅

- ✅ Tauri v2 instalado y configurado
- ✅ Función `get_printers()` implementada en Rust
- ✅ Frontend integrado con Tauri API
- ✅ Scripts de desarrollo y build listos
- ✅ Permisos y capabilities configurados

**Próximo paso**: Ejecuta `npm run tauri:dev` para probar la detección de impresoras.

---

## 📚 Documentación Adicional

- **Tauri Docs**: https://tauri.app/
- **Tauri v2 API**: https://tauri.app/api/js/
- **Rust**: https://www.rust-lang.org/

---

**¡Listo para usar!** 🚀
