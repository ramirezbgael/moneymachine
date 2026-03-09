# Guia para volver a mostrar Impuestos y Facturacion MX

Esta guia explica como volver a habilitar los apartados ocultos en:
- Configuracion
- Detalle de producto (Costos, impuestos y facturacion MX)
- Detalle de producto (Automatizaciones)

## 1) Configuracion

Archivo a editar:

`src/pages/configuracion/ConfiguracionPage.tsx`

## Paso rapido

1. Busca esta constante:

```ts
const SHOW_TAX_AND_FACTURACION_SECTIONS = false
```

2. Cambiala a:

```ts
const SHOW_TAX_AND_FACTURACION_SECTIONS = true
```

3. Guarda el archivo.

Con eso vuelven a aparecer en el menu de Configuracion:
- `Impuestos`
- `Facturacion MX`

## 2) Detalle de producto

Archivo a editar:

`src/pages/inventario/ProductoDetallesPage.tsx`

1. Busca esta constante:

```ts
const SHOW_PRODUCT_FACTURACION_SECTION = false
```

2. Cambiala a:

```ts
const SHOW_PRODUCT_FACTURACION_SECTION = true
```

3. Guarda el archivo.

Con eso vuelve a mostrarse en detalle de producto:
- Tarjeta `Costos, impuestos y facturacion (MX)`
- Boton `Editar precios` del resumen rapido

## 3) Automatizaciones en detalle de producto

Archivo a editar:

`src/pages/inventario/ProductoDetallesPage.tsx`

1. Busca esta constante:

```ts
const SHOW_PRODUCT_AUTOMATIONS_SECTION = false
```

2. Cambiala a:

```ts
const SHOW_PRODUCT_AUTOMATIONS_SECTION = true
```

3. Guarda el archivo.

Con eso vuelve a mostrarse:
- Seccion `Automatizaciones`
- Lista de sugerencias automaticas activas por defecto

## Nota tecnica

No se eliminaron componentes ni logica. Solo estan ocultos por flags.

## Si no aparecen de inmediato

- Recarga la aplicacion.
- Si el bundler estaba detenido, vuelve a levantarlo con tu comando de desarrollo.
