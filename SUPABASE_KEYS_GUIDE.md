# Supabase Keys Guide - Important Security Information

## ⚠️ Error: "Forbidden use of secret API key in browser"

Este error ocurre cuando estás usando la **service_role key** (clave secreta) en el navegador. **NUNCA** uses la service_role key en código del cliente.

## 🔑 Tipos de Claves en Supabase

### 1. **anon key** (Clave Pública Anónima) ✅ USAR EN EL NAVEGADOR
- **Uso**: Código del cliente (React, navegador)
- **Seguridad**: Respeta Row Level Security (RLS)
- **Dónde encontrarla**: Settings > API > "anon public" key
- **Variable de entorno**: `VITE_SUPABASE_ANON_KEY`

### 2. **service_role key** (Clave Secreta) ❌ NUNCA EN EL NAVEGADOR
- **Uso**: Solo en servidores/backend
- **Seguridad**: Bypassa RLS, acceso total a la base de datos
- **Dónde encontrarla**: Settings > API > "service_role" key (mantener secreta)
- **Variable de entorno**: `SUPABASE_SERVICE_ROLE_KEY` (solo backend)

## 📋 Cómo Configurar Correctamente

### Paso 1: Obtener las Claves

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** > **API**
4. Encontrarás:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (usa esta)
   - **service_role** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (NO uses esta en el navegador)

### Paso 2: Crear archivo `.env`

En la raíz del proyecto, crea un archivo `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key)
```

### Paso 3: Verificar que estás usando la clave correcta

La clave anónima (anon key) generalmente:
- Es más corta que la service_role key
- Está marcada como "public" o "anon" en el dashboard
- Puede ser compartida públicamente (aunque no es recomendable)

La service_role key:
- Es más larga
- Está marcada como "secret" o "service_role"
- **NUNCA debe estar en código del cliente**

## 🔒 Seguridad con Row Level Security (RLS)

Cuando usas la **anon key**:
- ✅ Respeta las políticas RLS que configuraste
- ✅ Los usuarios solo pueden acceder a datos permitidos
- ✅ Seguro para usar en el navegador

Cuando usas la **service_role key**:
- ❌ Bypassa todas las políticas RLS
- ❌ Acceso total a la base de datos
- ❌ Solo debe usarse en servidores/backend

## 🛠️ Solución al Error

Si estás viendo el error "Forbidden use of secret API key in browser":

1. **Verifica tu archivo `.env`**:
   ```bash
   # ❌ INCORRECTO
   VITE_SUPABASE_ANON_KEY=eyJ...service_role... (clave larga, service_role)
   
   # ✅ CORRECTO
   VITE_SUPABASE_ANON_KEY=eyJ...anon... (clave anónima)
   ```

2. **Reinicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

3. **Limpia la caché del navegador** (Ctrl+Shift+R o Cmd+Shift+R)

4. **Verifica en el código** que estás usando la variable correcta:
   ```javascript
   // ✅ Correcto
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
   
   // ❌ Incorrecto (nunca hagas esto)
   const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
   ```

## 📝 Ejemplo de Configuración Correcta

**Archivo `.env`** (en la raíz del proyecto):
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xyz123...
```

**Archivo `src/lib/supabase.js`** (ya está correcto):
```javascript
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## ✅ Checklist

- [ ] Usas la **anon key** en `.env`, no la service_role key
- [ ] El archivo `.env` está en la raíz del proyecto
- [ ] Las variables empiezan con `VITE_` (requerido para Vite)
- [ ] Reiniciaste el servidor después de cambiar `.env`
- [ ] El archivo `.env` está en `.gitignore` (no subirlo a Git)

## 🚨 Si Aún Tienes Problemas

1. Elimina el archivo `.env` actual
2. Crea uno nuevo copiando de `.env.example`
3. Obtén las claves frescas del dashboard de Supabase
4. Asegúrate de copiar la clave **anon public**, no la service_role
5. Reinicia el servidor

---

**Recuerda**: La service_role key es como la contraseña de administrador. Solo úsala en servidores, nunca en el navegador.