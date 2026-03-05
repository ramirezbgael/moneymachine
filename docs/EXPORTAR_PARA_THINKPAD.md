# Cómo exportar el POS para probar en la ThinkPad

La ThinkPad suele ser **Windows** o **Linux**. Tauri genera el instalador según el sistema donde ejecutas el build, así que tienes dos caminos:

---

## Opción 1: Compilar en la ThinkPad (recomendada)

Así obtienes un instalador nativo para esa máquina sin cross-compilar.

### 1. Llevar el código a la ThinkPad

- **Con Git** (si el proyecto está en un repo):
  ```bash
  git clone <url-del-repo> POS
  cd POS
  ```

- **Sin Git**: comprime la carpeta del proyecto (sin `node_modules` ni `src-tauri/target`) y copiala a la ThinkPad (USB, nube, etc.).

### 2. En la ThinkPad (Windows o Linux)

**Requisitos:**

- **Node.js** (LTS): https://nodejs.org/
- **Rust**: https://rustup.rs/  
  - En Windows: también necesitas [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) con “Desktop development with C++”.
- **Tauri (Windows)** extra: https://tauri.app/v1/guides/getting-started/prerequisites#windows

**Comandos:**

```bash
cd POS
npm install
npm run tauri:build
```

**Dónde está el instalador:**

- **Windows**:  
  `src-tauri\target\release\bundle\msi\pos-system_0.1.0_x64_*.msi`  
  (o en `bundle\nsis\` según configuración). Doble clic para instalar.

- **Linux**:  
  `src-tauri/target/release/bundle/appimage/pos-system_0.1.0_amd64.AppImage`  
  (o `.deb` si lo generó). Darle permiso de ejecución y ejecutar.

---

## Opción 2: Solo probar la interfaz (web) en la ThinkPad

Si solo quieres probar la UI sin instalar la app de escritorio:

### En tu Mac

```bash
npm run build
npm run preview
```

Esto sirve la app en `http://localhost:4173` (o el puerto que indique). Para que la ThinkPad acceda:

1. Averigua la IP de tu Mac en la red (en Mac: Preferencias del Sistema → Red, o `ifconfig | grep "inet "`).
2. En el mismo Wi‑Fi, desde la ThinkPad abre en el navegador:  
   `http://<IP-DE-TU-MAC>:4173`

**Limitación:** No tendrás funciones nativas (impresora, etc.), solo la interfaz web.

---

## Resumen rápido

| Objetivo              | Dónde hacerlo | Comando           | Resultado en ThinkPad                          |
|-----------------------|---------------|-------------------|------------------------------------------------|
| App instalable        | En la ThinkPad| `npm install && npm run tauri:build` | Instalador `.msi` (Windows) o `.AppImage`/`.deb` (Linux) |
| Solo ver la UI (web)  | En tu Mac     | `npm run build && npm run preview`   | Abrir en navegador: `http://<IP-Mac>:4173`     |

Si dices si la ThinkPad es Windows o Linux, se pueden afinar los pasos (por ejemplo, instalación de Rust y deps en Windows).
