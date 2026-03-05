# POS Printer Service

Servicio local Node.js para detectar impresoras del sistema.

## Instalación

```bash
cd printer-service
npm install
```

## Uso

### Desarrollo

```bash
npm run dev
```

### Producción

```bash
npm start
```

## Endpoints

### GET `/api/printers`

Retorna lista de impresoras detectadas.

**Response:**
```json
{
  "success": true,
  "printers": [
    { "name": "EPSON TM-T20", "status": "available" },
    { "name": "HP LaserJet", "status": "available" }
  ],
  "count": 2
}
```

### GET `/api/health`

Health check del servicio.

**Response:**
```json
{
  "status": "ok",
  "service": "POS Printer Service",
  "platform": "darwin",
  "timestamp": "2026-01-24T12:00:00.000Z"
}
```

## Integración con POS

El servicio se ejecuta en `http://localhost:3001` y el POS lo detecta automáticamente.

## Auto-start (Opcional)

Para que el servicio inicie automáticamente:

### macOS (LaunchAgent)

```bash
# Crear ~/Library/LaunchAgents/com.pos.printerservice.plist
```

### Windows (Service)

Usar `node-windows` o `pm2` para crear un servicio.

### Linux (systemd)

Crear servicio systemd.

---

**Nota**: Este servicio es opcional. El POS funciona sin él, solo que la detección de impresoras será manual.
