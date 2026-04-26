# Estrategia de repositorio para iniciar

## Recomendacion

Para este proyecto recomiendo iniciar con **un monorepo** y no con repositorios separados.

## Estructura recomendada

```text
rat_dnsipd/
  backend/
  frontend/
  docs/
  deploy/
```

## Por que monorepo

- backend y frontend comparten contrato funcional
- el dominio aun esta evolucionando
- reduce divergencia entre API y UI
- simplifica versionado del MVP
- facilita despliegue coordinado

## Cuándo separar repositorios

Solo recomendaria separar en repos distintos si mas adelante ocurre una de estas condiciones:

- equipos distintos mantienen backend y frontend de forma independiente
- se establecen pipelines completamente separados
- el frontend se convierte en producto independiente
- se requiere versionado desacoplado

## Repositorio remoto sugerido

Nombre:

- `rat_dnsipd`

Branching inicial:

- `main`
- `develop`
- `feature/<modulo>`

## Primer foco de implementacion

Desde backend, el orden correcto es:

1. infraestructura base del proyecto
2. PostgreSQL
3. Prisma
4. auth
5. users
6. catalogos
7. estructura organica
8. RAT
9. actividad_version
