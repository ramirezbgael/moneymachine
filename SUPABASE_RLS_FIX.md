# Solución a errores de CORS y RLS en Supabase

## Problema
Los errores que estás viendo indican que las políticas de Row Level Security (RLS) están bloqueando el acceso a las tablas desde el navegador.

```
Failed to load resource: La conexión a Internet parece estar desactivada
Fetch API cannot load https://...supabase.co/rest/v1/... due to access control checks
```

## Solución Rápida: Desactivar RLS (Solo para desarrollo)

### Opción 1: Desde el Dashboard de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Authentication** > **Policies**
3. Para cada tabla (`products`, `sales`, `sale_items`, `customers`):
   - Haz clic en la tabla
   - Desactiva el toggle "Enable RLS"

### Opción 2: Ejecutar SQL en el Editor

```sql
-- Desactivar RLS en todas las tablas (SOLO PARA DESARROLLO)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
```

## Solución Permanente: Configurar Políticas RLS Correctas

Si quieres mantener RLS activado (recomendado para producción), necesitas crear políticas que permitan el acceso:

```sql
-- Habilitar RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados (permite todo para desarrollo)
-- PRODUCTS
CREATE POLICY "Allow all for authenticated users" ON products
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- CUSTOMERS
CREATE POLICY "Allow all for authenticated users" ON customers
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- SALES
CREATE POLICY "Allow all for authenticated users" ON sales
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- SALE_ITEMS
CREATE POLICY "Allow all for authenticated users" ON sale_items
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

## Solución Alternativa: Usar Anon Key con Políticas Públicas

Si no quieres autenticación, puedes permitir acceso público:

```sql
-- Políticas para acceso público (NO recomendado para producción)
-- PRODUCTS
CREATE POLICY "Allow public read" ON products
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert" ON products
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update" ON products
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Repetir para otras tablas...
```

## Verificar que estás usando la clave correcta

Asegúrate de que en tu archivo `.env` estás usando el **anon key** y NO el **service_role key**:

```env
# ✅ CORRECTO - Anon key (empieza con eyJ...)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ INCORRECTO - Service role key (nunca usar en el navegador)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role...
```

## Modo Mock (Sin Supabase)

El sistema ahora incluye datos mock automáticos. Si los errores persisten, puedes:

1. **Opción 1**: Eliminar las variables de entorno de Supabase temporalmente
   ```bash
   # Comentar en .env
   # VITE_SUPABASE_URL=...
   # VITE_SUPABASE_ANON_KEY=...
   ```

2. **Opción 2**: El sistema detectará los errores y usará datos mock automáticamente

## Ejecutar el SQL

1. Ve a **SQL Editor** en tu Dashboard de Supabase
2. Crea una nueva query
3. Pega el SQL de arriba (elige la solución que prefieras)
4. Haz clic en **Run**

## Verificar Views

Asegúrate de que las vistas existan ejecutando:

```sql
-- Verificar vistas
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public';
```

Si no existen, ejecuta el archivo `supabase_reports_views.sql` que está en tu proyecto.

## Resumen

**Para desarrollo rápido**: Desactiva RLS
**Para producción**: Configura políticas RLS con autenticación
**Si no tienes Supabase configurado**: El sistema usará datos mock automáticamente

## Estado Actual del Sistema

✅ El sistema ya está configurado para usar datos mock cuando Supabase falla
✅ Los errores de CORS no rompen la aplicación
✅ Los reportes mostrarán datos de ejemplo si no pueden conectar a Supabase
