# Migración MoneyMachine — 6 fases + comprobaciones

Ejecuta **en orden** en **staging** primero. Cada archivo SQL es independiente salvo dependencias explícitas.

| Fase | Archivo | Contenido |
|------|---------|-----------|
| — | `00_PRECHECKS.sql` | **Pre-checks** (solo lectura) |
| **1** | `01_PHASE1_new_tables.sql` | Tablas nuevas no destructivas |
| **2** | `02_PHASE2_add_nullable_columns.sql` | Columnas nuevas **solo NULL** |
| **3** | `03_PHASE3_backfill_and_renames.sql` | Backfill + renombres; **sin** asignar `business_id` al azar |
| **4** | `04_PHASE4_validation.sql` | **Validación** antes de restricciones (comenta SELECTs si falta una tabla) |
| **5** | `05_PHASE5_constraints_functions_views.sql` | NOT NULL, FK, DROP legacy, índices únicos + **funciones/triggers/vista** (necesario antes del RLS) |
| **6** | `06_PHASE6_rls.sql` | **RLS último** — DROP políticas objetivo + políticas nuevas |
| — | `08_POSTCHECKS.sql` | **Post-checks** tras fase 6 |
| — | `99_ROLLBACK_HELPERS.sql` | Backup / notas de reversión (no hay “undo” DDL automático) |

**Orden recomendado:** `00` → `01` … → `06` → `08`.

**Rollback real:** `pg_dump` / snapshot de proyecto Supabase antes de tocar producción. Ver `99_ROLLBACK_HELPERS.sql`.

**Monolito legacy:** `supabase_production_saas_refactor.sql` en la raíz del repo — solo referencia; para datos reales usa esta carpeta.
