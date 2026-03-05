# Roadmap: POS → SaaS multi-tenant

Plan para convertir el POS actual en un SaaS multi-tenant (varios negocios en una sola instancia, datos aislados por tenant).

---

## Resumen de cambios

| Área | Hoy | Objetivo SaaS |
|------|-----|----------------|
| **Datos** | Una BD, sin tenant | Todas las tablas con `tenant_id`, RLS por tenant |
| **Auth** | Usuario → login | Usuario → pertenece a uno o más **tenants** (negocios) |
| **Onboarding** | Solo login | Registro → crea **tenant** + primer usuario |
| **App** | Sin contexto tenant | Contexto global: “tenant activo”; todas las queries filtradas |

---

## Fase 1: Modelo de datos (tenant_id + RLS)

### 1.1 Tabla `tenants` (organizaciones/negocios)

```sql
-- Ejecutar en Supabase SQL Editor
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,        -- ej: "ferreteria-san-martin"
  plan TEXT DEFAULT 'starter',      -- starter | pro | enterprise
  settings JSONB DEFAULT '{}',       -- logo_url, currency, timezone, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
```

### 1.2 Tabla `tenant_members` (usuarios ↔ tenants)

Un usuario puede pertenecer a varios negocios (ej: dueño de 2 tiendas o empleado en una).

```sql
CREATE TABLE tenant_members (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- owner | admin | member | viewer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);
```

### 1.3 Añadir `tenant_id` a todas las tablas de negocio

- **products** → `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- **customers** → `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- **sales** → `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- **sale_items** → no hace falta si sales ya tiene tenant_id (se hereda por `sale_id`)
- **quotations** → `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`

Importante: el **UNIQUE** de `products(code)` debe ser por tenant: `UNIQUE(tenant_id, code)` (mismo código puede existir en distintos negocios).

Ejemplo para `products`:

```sql
ALTER TABLE products ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
-- Migrar datos existentes: crear un tenant "Default" y asignar todo a él
INSERT INTO tenants (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'default');
UPDATE products SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_products_tenant ON products(tenant_id);
-- Cambiar unique de code a (tenant_id, code)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_code_key;
CREATE UNIQUE INDEX idx_products_tenant_code ON products(tenant_id, code);
```

Repetir idea para `customers`, `sales`, `quotations` (y vistas que usen estas tablas).

### 1.4 RLS (Row Level Security) por tenant

Objetivo: cada usuario solo ve/edita filas del tenant en el que está.

- Obtener `tenant_id` del usuario: desde `tenant_members` usando `auth.uid()`.
- Política típica (ejemplo para `products`):

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their tenant products"
  ON products FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );
```

Aplicar políticas equivalentes a: `tenants`, `tenant_members`, `customers`, `sales`, `sale_items`, `quotations`, y vistas/materialized views que expongan datos por tenant.

---

## Fase 2: Auth y contexto “tenant activo”

### 2.1 Tras login: saber a qué tenant(s) pertenece el usuario

- Opción A (recomendada al inicio): **un usuario = un tenant**. Al hacer login, buscas en `tenant_members` el único `tenant_id` y lo guardas en estado global.
- Opción B: el usuario puede cambiar de negocio (selector de tenant). Cargas sus tenants y guardas `currentTenantId` en el store.

En ambos casos necesitas:

- Tras `signInWithPassword`, leer `tenant_members` (por `auth.uid()`) y guardar en el cliente el `tenant_id` (o lista de tenants + uno activo).

### 2.2 Guardar `tenant_id` en el cliente

- **authStore** (o un `tenantStore`): después de login exitoso, hacer una query a `tenant_members` (o a una RPC que devuelva el tenant por usuario) y guardar:
  - `currentTenantId`
  - opcional: `tenants[]` y `currentTenantId` si hay selector de negocio
- Persistir en `localStorage` o en sesión para no perder el tenant al recargar (y validar en backend con RLS que ese usuario pertenece a ese tenant).

### 2.3 Todas las queries deben usar `tenant_id`

- Con RLS **activado**, si no pasas `tenant_id` en las queries, Supabase igual puede filtrar por las políticas. Pero para inserts/updates debes **enviar siempre** `tenant_id` desde el cliente (o usar un trigger/default en BD).
- En tu código: en cada `supabase.from('products').insert(...)` (y resto de tablas), incluir `tenant_id: currentTenantId`.
- Revisar: `productService`, `saleService`, `quotationService`, `reportsStore`, `pendingStore`, etc. Asegurar que:
  - Todos los `insert` llevan `tenant_id`.
  - Los `select` pueden depender solo de RLS o filtrar explícitamente por `tenant_id` (redundante pero claro).

---

## Fase 3: Onboarding (registro = crear tenant + usuario)

### 3.1 Flujo de registro

1. Pantalla de registro: email, contraseña, **nombre del negocio** (y opcional: nombre del usuario).
2. Backend (Supabase):
   - Crear usuario con `supabase.auth.signUp(email, password)`.
   - En un **Edge Function** o con un trigger en BD + función:
     - Crear fila en `tenants` (nombre, slug derivado del nombre).
     - Crear fila en `tenant_members` (tenant recién creado, user_id del usuario, role = 'owner').
   - Si no usas Edge Function: hacer el “signUp” desde el cliente y luego una llamada a una RPC que, dado el usuario recién creado, cree tenant + tenant_members (la RPC debe ejecutarse con permisos de servicio o con un trigger `on auth user created`).

### 3.2 Primera vez tras registro

- Tras `signUp` + confirmación (si usas email confirmation), el usuario hace login.
- En el cliente: al cargar la app, si el usuario está autenticado pero no tiene `currentTenantId`, cargar sus tenants desde `tenant_members` y asignar el primero (o el único) como `currentTenantId`.

---

## Fase 4: Ajustes en la app (React)

### 4.1 Contexto o store de tenant

- Crear un `tenantStore` (Zustand) o React Context que exponga:
  - `currentTenantId`
  - `currentTenant` (nombre, slug, settings si lo necesitas)
  - `setCurrentTenant(id)` si hay más de un tenant
- Rellenar este store tras login (y al iniciar la app si ya hay sesión).

### 4.2 Servicios

- Pasar `tenant_id` en todos los inserts/updates. Opciones:
  - Leer `currentTenantId` del store dentro de cada servicio, o
  - Crear un wrapper de Supabase que inyecte `tenant_id` en cada insert/update según el tenant activo.
- Revisar vistas de reportes en Supabase: que filtren por `tenant_id` (o que las tablas subyacentes tengan RLS).

### 4.3 UI

- Si hay un solo tenant: no mostrar selector.
- Si hay varios: en el header o en Settings, un dropdown “Negocio: X” que llame a `setCurrentTenant(id)` y opcionalmente recargue datos.
- Pantalla de “Crear negocio” (opcional): para usuarios que pueden crear más de un tenant (según plan o rol).

---

## Fase 5: Billing y planes (opcional para un MVP SaaS)

- Tabla `tenants` ya tiene `plan` (starter/pro/enterprise).
- Integrar Stripe (o similar): al registrarse, crear customer en Stripe, asociar a `tenant_id`.
- Límites por plan (ej: número de productos, de ventas/mes, usuarios por tenant) y comprobarlos en backend o en Edge Functions antes de crear recurso.
- No es estrictamente necesario para “multi-tenant”; puedes dejar un solo plan y activar facturación después.

---

## Orden sugerido de implementación

1. **Fase 1**  
   - Crear `tenants` y `tenant_members`.  
   - Añadir `tenant_id` a products, customers, sales, quotations (y vistas).  
   - Migrar datos existentes a un tenant “Default”.  
   - Activar RLS y políticas por tenant.

2. **Fase 2**  
   - Tras login, cargar tenant(s) del usuario y guardar `currentTenantId` en store.  
   - Asegurar que todos los servicios envían `tenant_id` en inserts/updates.

3. **Fase 3**  
   - Pantalla de registro.  
   - Lógica en backend (Edge Function o RPC + trigger) para crear tenant + tenant_members al registrarse.

4. **Fase 4**  
   - Ajustar UI (selector de tenant si aplica, nombre del negocio en header, etc.).

5. **Fase 5**  
   - Cuando quieras monetizar: planes, Stripe, límites.

---

## Implementación realizada

- **`supabase_multi_tenant_migration.sql`**  
  Script ejecutado en el SQL Editor de Supabase: crea `tenants`, `tenant_members`, añade `tenant_id` a las tablas de negocio, migra datos al tenant por defecto, ajusta uniques y RLS. Incluye la función `public.create_tenant_and_join(p_name, p_slug)` para registro.

- **`src/store/tenantStore.js`**  
  Store con `currentTenantId`, `currentTenant`, `tenants`, `loadTenants(userId)`, `setCurrentTenant(id)`, `clearTenants()`.

- **Auth**  
  Tras login o `checkSession` se llama a `loadTenants(user.id)`. Al cerrar sesión se hace `clearTenants()`. Los servicios que hacen insert (productService, saleService, quotationService) envían `tenant_id` desde `useTenantStore.getState().currentTenantId`.

- **Registro**  
  Ruta `/register`, componente `Register.jsx`: email, contraseña y nombre del negocio. Tras `signUp` se llama a la RPC `create_tenant_and_join` y se cargan los tenants. En Login hay enlace a “Create one”.

- **Layout**  
  Muestra el nombre del tenant actual en el sidebar. Si el tenant está cargando o hay error (sin tenant asignado), se muestra loading o mensaje con opción de cerrar sesión.
