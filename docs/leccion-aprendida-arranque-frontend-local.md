# Leccion aprendida: arranque del frontend local

Fecha: 2026-04-28

## Sintoma observado

El frontend quedaba caido o inestable en `http://127.0.0.1:5173`, con errores como:

- `ERR_CONNECTION_REFUSED`
- `ENOENT: no such file or directory, open '...frontend\\node_modules\\react\\index.js'`
- instancias duplicadas de `vite` levantadas en `5173` y `5174`

## Causa raiz

El workspace del monorepo quedo en estado inconsistente despues de reinicios y arranques parciales:

- dependencias restauradas solo a nivel parcial
- cache del optimizador de Vite desactualizado
- multiples instancias de frontend ejecutandose al mismo tiempo

## Accion correctiva que si resolvio el problema

1. Reinstalar dependencias desde la raiz del monorepo:

```powershell
cd E:\developement\rat_dnsipd
npm install
```

2. Reiniciar el frontend forzando la reoptimizacion de Vite:

```powershell
cd E:\developement\rat_dnsipd\frontend
npm run dev -- --host 127.0.0.1 --port 5173 --force
```

3. Dejar una sola instancia de `vite` escuchando en `5173`.

## Regla operativa

Si el frontend vuelve a fallar despues de reiniciar el equipo o despues de cambios grandes en dependencias:

- no reinstalar solo dentro de `frontend` como primer paso
- reinstalar desde la raiz `E:\developement\rat_dnsipd`
- levantar Vite con `--force`
- verificar que no exista otra instancia ocupando `5173`
