# Sistema Offline-First para MoneyMachine

## 📋 Descripción General

MoneyMachine ahora cuenta con un sistema **offline-first** que permite trabajar sin conexión a internet. Todos los cambios se guardan localmente y se sincronizan automáticamente cuando vuelve la conexión.

## 🎯 Características

### ✅ Lo que funciona sin internet:
- ✅ Ver inventario completo
- ✅ Buscar productos
- ✅ Agregar nuevos productos
- ✅ Editar productos existentes
- ✅ Eliminar productos
- ✅ Ajustar stock (incrementar/decrementar)
- ✅ Registro masivo de productos
- ✅ Ventas (próximamente)

### 🔄 Sincronización automática:
- Todos los cambios se guardan primero en IndexedDB local
- Cuando hay internet, se intentan sincronizar con Supabase
- Si falla la sincronización, se encola para reintento automático
- Cuando vuelve el internet, se sincronizan automáticamente todas las operaciones pendientes

### 📊 Verificación de estado (en Configuración):
- ✅ Estado de conexión en tiempo real
- ✅ Contador de operaciones pendientes de sincronización
- ✅ Fecha y hora de última sincronización exitosa
- ✅ Cantidad de productos almacenados localmente
- ✅ Botones para sincronización manual
- ✅ Botón para actualizar datos desde servidor
- ✅ Información educativa sobre el sistema offline

## 🏗️ Arquitectura

### Servicios creados:

#### 1. **localStorageService.js**
- Maneja IndexedDB para almacenamiento local persistente
- Stores: products, sales, pending_operations, metadata
- API simple para CRUD de productos

#### 2. **networkService.js**
- Detecta el estado de la red (online/offline)
- Listeners para cambios de conectividad
- Test de conectividad real

#### 3. **syncQueueService.js**
- Gestiona la cola de operaciones pendientes
- Sincroniza automáticamente cuando hay conexión
- Soporta operaciones: CREATE, UPDATE, DELETE, STOCK_ADJUSTMENT

#### 4. **offlineProductService.js**
- Wrapper offline-first del productService original
- Prioriza datos locales para respuesta inmediata
- Sincroniza en background cuando hay conexión

## 🚀 Cómo usar

### Para el usuario final:

1. **Indicador de red**: Esquina superior derecha muestra el estado:
   - 🟢 Verde: En línea, todo sincronizado
   - 🟡 Ámbar: En línea con operaciones pendientes
   - 🔴 Rojo: Sin conexión

2. **Click en el indicador**: Ver detalles de sincronización y forzar sync manual

3. **Sección en Configuración**: 
   - Ve a Configuración → Sincronización
   - Verifica el estado completo de tu copia local
   - Ver operaciones pendientes
   - Última sincronización
   - Cantidad de productos en tu dispositivo
   - Botones para sincronizar manualmente o actualizar desde servidor

4. **Trabajar normalmente**: Todas las operaciones funcionan igual, con o sin internet

### Para desarrolladores:

#### Inicialización (ya configurado):
```javascript
// En App.jsx - ya está implementado
import { offlineProductService } from './services/offlineProductService'

useEffect(() => {
  offlineProductService.init()
}, [])
```

#### Usar el servicio offline:
```javascript
// En lugar de:
// import { productService } from './services/productService'

// Usar:
import { offlineProductService } from './services/offlineProductService'

// Misma API que productService:
const products = await offlineProductService.getAll()
const product = await offlineProductService.getById(id)
await offlineProductService.create(productData)
await offlineProductService.update(id, updates)
await offlineProductService.delete(id)
```

#### Verificar estado de sincronización:
```javascript
const status = await offlineProductService.getSyncStatus()
// {
//   isOnline: true/false,
//   pendingOperations: 5,
//   lastSync: Date
// }
```

## 📊 Flujo de operaciones

### Crear producto:
1. Usuario crea producto en UI
2. Se guarda inmediatamente en IndexedDB con ID temporal
3. Si hay internet → se crea en Supabase y se reemplaza con ID real
4. Si no hay internet → se encola para sincronización posterior
5. Cuando vuelve internet → se sincroniza automáticamente

### Actualizar/Eliminar producto:
1. Cambio se aplica inmediatamente a IndexedDB
2. Si hay internet → se sincroniza con Supabase
3. Si no hay internet → se encola la operación
4. Sincronización automática cuando vuelve conexión

## 🔧 Configuración de Tauri

Para Tauri, IndexedDB funciona nativamente ya que usa WebView. No se requiere configuración adicional.

### Permisos en tauri.conf.json (verificar):
```json
{
  "tauri": {
    "allowlist": {
      "fs": {
        "scope": ["$APPDATA/moneymachine/*"]
      }
    }
  }
}
```

## 🐛 Debugging

### Ver datos en IndexedDB:
1. Abrir DevTools (F12)
2. Application → Storage → IndexedDB → moneymachine_db
3. Ver stores: products, pending_operations, metadata

### Logs útiles:
```javascript
// Ver productos locales
import { localStorageService } from './services/localStorageService'
const products = await localStorageService.getProducts()
console.log('Local products:', products)

// Ver operaciones pendientes
const pending = await localStorageService.getPendingOperations()
console.log('Pending operations:', pending)

// Forzar sincronización
import { syncQueueService } from './services/syncQueueService'
await syncQueueService.forceSyncNow()
```

## ⚠️ Consideraciones

### Limitaciones:
- IndexedDB tiene límite de ~250MB en escritorio (más que suficiente para productos)
- Los IDs temporales (temp_xxx) se reemplazan al sincronizar
- Conflictos de sincronización: último cambio gana (puede mejorarse con timestamps)

### Mejoras futuras:
- Sincronización de ventas
- Resolución de conflictos más sofisticada
- Exportar/importar datos locales
- Compresión de datos para mayor capacidad
- Métricas de uso offline

## 📝 Notas de implementación

### Stores actualizados:
- ✅ **inventoryStore.ts**: Usa `offlineProductService` en lugar de `productService`

### Componentes nuevos:
- ✅ **NetworkStatus.tsx**: Indicador visual de estado de red y operaciones pendientes (esquina superior derecha)
- ✅ **SyncStatusSettings.tsx**: Panel de configuración completo para verificar y gestionar la sincronización

### Servicios creados:
- ✅ **localStorageService.js**: Almacenamiento local con IndexedDB
- ✅ **networkService.js**: Detección de conectividad
- ✅ **syncQueueService.js**: Cola de sincronización
- ✅ **offlineProductService.js**: Wrapper offline-first

## 🎓 Recursos

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [Offline First](https://offlinefirst.org/)
- [Tauri Storage](https://tauri.app/v1/guides/features/storage/)

## 🤝 Soporte

Si hay problemas con la sincronización:
1. Verificar que Supabase esté configurado correctamente
2. Ver logs en consola (buscar 🔄 y 📴)
3. Forzar sincronización manual desde el indicador de red
4. Como último recurso, limpiar datos locales: `localStorageService.clearAll()`

---

**Última actualización**: Marzo 2026  
**Versión**: 1.0.0  
**Estado**: ✅ Implementado y funcional
