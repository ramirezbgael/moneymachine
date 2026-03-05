# Tauri Quick Start - POS System

## ✅ Setup Completado

Ya tienes todo configurado. Solo falta compilar y probar.

---

## 🚀 Comandos

### Desarrollo

```bash
npm run tauri:dev
```

Esto:
1. Inicia el servidor Vite (`npm run dev`)
2. Compila Tauri
3. Abre la app de escritorio
4. Hot reload automático

### Build para Producción

```bash
npm run tauri:build
```

Esto crea:
- **macOS**: `src-tauri/target/release/bundle/macos/pos-system.app`
- **Windows**: `src-tauri/target/release/bundle/msi/pos-system_0.1.0_x64_en-US.msi`
- **Linux**: `src-tauri/target/release/bundle/appimage/pos-system_0.1.0_amd64.AppImage`

---

## 🔧 Detección de Impresoras

La función `get_printers()` está implementada en `src-tauri/src/lib.rs`:

- **Windows**: Usa PowerShell `Get-Printer`
- **macOS**: Usa `lpstat -p`
- **Linux**: Usa `lpstat -p` (CUPS)

El frontend (`Settings.jsx`) ya está configurado para usar Tauri automáticamente.

---

## 📁 Estructura

```
POS/
├── src-tauri/          # Backend Rust
│   ├── src/
│   │   ├── main.rs     # Entry point
│   │   └── lib.rs      # Lógica (get_printers aquí)
│   ├── Cargo.toml      # Dependencias Rust
│   └── tauri.conf.json # Configuración
├── src/                # Frontend React
└── dist/               # Build de Vite
```

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

### Error: "Failed to build"

1. Verifica que Rust esté instalado: `rustc --version`
2. Limpia el build: `cd src-tauri && cargo clean`
3. Reintenta: `npm run tauri:dev`

### La app no detecta impresoras

1. Verifica permisos del sistema
2. Revisa la consola de Tauri (en desarrollo)
3. Prueba el comando manualmente:
   - Windows: `powershell -Command "Get-Printer"`
   - macOS/Linux: `lpstat -p`

---

## 📦 Bundle Size

- **Tauri**: ~3-5MB
- **Electron**: ~100-150MB

**Ahorro**: ~95% más ligero 🎉

---

## ✅ Checklist

- [x] Tauri CLI instalado
- [x] Tauri API instalado
- [x] Scripts en package.json
- [x] main.rs configurado
- [x] lib.rs con get_printers()
- [x] Cargo.toml con dependencias
- [x] Settings.jsx actualizado
- [x] capabilities configurado

**¡Listo para usar!** 🚀

Ejecuta `npm run tauri:dev` para probar.
