# Supabase Storage Setup - Product Images

## Configuración del Bucket de Imágenes

### 1. Ejecutar SQL en Supabase

Ejecuta el archivo `supabase_storage_setup.sql` en el SQL Editor de Supabase:

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Abre **SQL Editor**
3. Copia y pega el contenido de `supabase_storage_setup.sql`
4. Click en **RUN**

Esto creará:
- ✅ Bucket `product-images` (público)
- ✅ Políticas de acceso (lectura pública, escritura autenticada)
- ✅ Columna `image_url` en tabla `products`

### 2. Verificar el Bucket

En Supabase Dashboard:
1. Ve a **Storage**
2. Deberías ver el bucket `product-images`
3. Verifica que esté marcado como **Public**

### 3. Verificar Políticas

En **Storage > Policies**:
- Deberías ver 4 políticas para `product-images`:
  - Public Access (SELECT)
  - Authenticated users can upload (INSERT)
  - Authenticated users can update (UPDATE)
  - Authenticated users can delete (DELETE)

### 4. Verificar Columna en Products

Ejecuta en SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'image_url';
```

Deberías ver la columna `image_url` de tipo `TEXT`.

---

## Uso en la Aplicación

### Flujo de Imágenes

1. **Agregar Producto (Step-by-step)**:
   - Paso 3: "Product Image"
   - Opciones: Subir desde dispositivo o Capturar con cámara
   - Preview inmediato
   - Opcional: Quitar fondo

2. **Editar Producto**:
   - Sección de imagen al inicio del formulario
   - Mismas opciones que agregar

3. **Almacenamiento**:
   - Imágenes se suben automáticamente a Supabase Storage
   - URL se guarda en `image_url` de la tabla `products`
   - Si falla la subida, se guarda como base64 (fallback)

### Estructura de Archivos

```
Supabase Storage:
└── product-images/
    ├── product-123-abc123.png
    ├── product-456-def456.jpg
    └── ...
```

### URLs Generadas

Las URLs tendrán el formato:
```
https://[project].supabase.co/storage/v1/object/public/product-images/product-123-abc123.png
```

---

## Troubleshooting

### Error: "Bucket not found"
- Ejecuta el SQL de setup nuevamente
- Verifica que el bucket se creó en Storage

### Error: "Permission denied"
- Verifica las políticas de Storage
- Asegúrate de estar autenticado

### Imágenes no se muestran
- Verifica que el bucket sea público
- Revisa la consola del navegador para errores CORS
- Verifica que `image_url` tenga el valor correcto en la BD

### Fallback a base64
- Si la subida falla, se guarda como base64
- Funciona pero no es óptimo para producción
- Revisa logs de consola para errores

---

## Notas

- **Mock Mode**: Si no hay Supabase configurado, las imágenes se guardan como base64
- **Tamaño**: Considera limitar el tamaño de imágenes (ej: max 5MB)
- **Formatos**: Se aceptan todos los formatos de imagen (PNG, JPG, WEBP, etc.)
- **Optimización**: Para producción, considera comprimir imágenes antes de subir

---

**Status**: ✅ **Configuración Lista**

Una vez ejecutado el SQL, las imágenes se subirán automáticamente a Supabase Storage.
