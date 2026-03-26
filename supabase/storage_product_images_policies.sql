-- =============================================================================
-- Storage: imágenes de productos (bucket `product-images`)
-- Ejecutar en Supabase → SQL Editor (ajusta el nombre del bucket si usas otro).
--
-- Elige UNA estrategia de lectura:
--   A) Bucket PÚBLICO → cualquiera puede ver la URL pública (sin sesión).
--   B) Bucket PRIVADO → solo usuarios logueados; la app usa URLs firmadas.
--
-- En ambos casos hace falta permitir INSERT/UPDATE/DELETE a usuarios autenticados
-- si subes fotos desde la app con sesión iniciada.
-- =============================================================================

-- Asegura RLS en storage (Supabase lo suele tener activo)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Crear bucket si no existe (público = true en A, false en B)
-- Opción A — público:
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Opción B — privado (descomenta y comenta la de arriba si quieres bucket privado):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('product-images', 'product-images', false)
-- ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Quitar políticas viejas del mismo nombre para poder recrearlas
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "product_images_auth_read" ON storage.objects;
DROP POLICY IF EXISTS "product_images_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_auth_delete" ON storage.objects;

-- -----------------------------------------------------------------------------
-- LECTURA: elige SOLO una de las dos (comenta la que no uses)
-- -----------------------------------------------------------------------------

-- A) Bucket público: lectura para todos (anon + autenticados). Sirve para <img src="URL pública">.
CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- B) Bucket privado: solo lectura autenticada (necesario para createSignedUrl / descargas con JWT).
-- Si usas bucket privado, COMENTA la política "product_images_public_read" de arriba y DESCOMENTA:
-- CREATE POLICY "product_images_auth_read"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'product-images');

-- Si quieres público PERO también asegurar a autenticados, basta la política A (USING sin TO).

-- -----------------------------------------------------------------------------
-- Escritura: usuarios logueados (subir / editar / borrar en el bucket)
-- -----------------------------------------------------------------------------
CREATE POLICY "product_images_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Verificación rápida:
-- SELECT id, name, public FROM storage.buckets WHERE id = 'product-images';
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'product_images%';
