# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**rat_dnsipd** is a full-stack privacy compliance management system (Sistema de Gestión de Actividades de Tratamiento) built for the IESS institution. It manages RATs (Registros de Actividades de Tratamiento), information assets, MTGE assessments, risks, EIPD evaluations, and organizational structure — all governed by strict RBAC/ABAC rules.

**Stack:** NestJS 10 + Prisma 5 (PostgreSQL) backend; React 18 + Vite 5 + TanStack Query + Zustand frontend. Monorepo with Docker-based dev and production environments.

---

## Commands

### Development (Docker — recommended)

```bash
npm run docker:dev              # Full stack: postgres + backend (3000) + frontend (5173)
npm run docker:dev:detached     # Same, detached
npm run docker:dev:migrate      # Run Prisma migrations inside dev container
npm run docker:dev:seed         # Seed database with org structure, catalogs, demo users
```

### Local Development (without Docker)

```bash
# Backend
cd backend && npm run start:dev         # NestJS with hot reload
cd backend && npm run prisma:generate   # Regenerate Prisma client after schema changes
cd backend && npm run prisma:migrate    # Apply pending migrations
cd backend && npm run prisma:seed       # Seed database

# Frontend
cd frontend && npm run dev              # Vite dev server at localhost:5173
```

### Build & Production

```bash
npm run build                   # Build both backend and frontend
npm run docker:prod             # Production containers (requires external PostgreSQL)
npm run docker:prod:migrate     # Prod migrations
```

### Data Utilities

```bash
cd backend && npm run activos:import     # Bulk import assets from Excel
cd backend && npm run activos:normalize  # Normalize asset text fields
```

**No automated tests exist** in this codebase.

---

## Architecture

### Request Flow

```
React SPA (Zustand auth + TanStack Query)
  → Axios (Bearer JWT) → /api proxy (Vite dev) or Nginx (/api rewrite, prod)
  → NestJS (port 3000, global prefix /api)
      → JwtAuthGuard → CurrentUser decorator
      → AuthorizationScopeService (RBAC/ABAC Prisma where clauses)
      → Feature Service → Prisma → PostgreSQL 16
```

### Backend Module Pattern

Every feature follows the same NestJS module structure:
- **Controller** — HTTP endpoints, uses `@CurrentUser()` to inject `AuthenticatedUser`
- **Service** — business logic; calls `AuthorizationScopeService.ratWhere()` / `actividadWhere()` / `activoWhere()` to scope queries by role
- **DTO classes** — validated via global `ValidationPipe` (whitelist + transform + forbidNonWhitelisted)
- **Audit** — `AuditService.log()` called inside Prisma transactions for atomicity

Key backend modules: `auth`, `rat`, `actividades`, `actividad-versiones`, `actividad-activos`, `activos`, `catalogos`, `estructura-organica`, `mtge`, `riesgos`, `eipd`, `audit`, `users`.

### RBAC / Authorization

11 roles defined in `prisma/schema.prisma` (`RoleCode` enum). Two axis:
1. **Role capabilities** — grouped into capability sets checked in services
2. **Organizational scope** — non-global users are restricted to their `dependenciaId` (and optionally `subdireccionId`); `AuthorizationScopeService` composes these as Prisma `where` filters

**Backend is the security authority.** Frontend replicates role checks only for UX (hiding buttons), never for actual access control.

### Frontend Feature Structure

Pages live in `frontend/src/features/{feature}/`. Each feature may have its own hooks, components, and types. State management:
- **Zustand** (`auth` store) — session, user, permissions
- **TanStack Query** — all server state (fetching, caching, mutations)
- **React Hook Form + Zod** — form validation
- **localStorage** — some partial/draft state (EIPD, MTGE workspace — these are known gaps awaiting backend persistence)

Routing is in `frontend/src/router/AppRouter.tsx` with `RequireAuth` and `ModuleAccessGate` guards for role-based navigation.

### Known Gaps / Active Work Areas

- **RatCreatePage wizard** (`frontend/src/features/rat/`) saves to localStorage/workspace state, not yet persisted to the backend RAT and Activities endpoints — this is the primary integration gap
- **EIPD and Riesgos UIs** mix localStorage with backend APIs (partial implementation)
- **Only one Prisma migration exists** (`20260425061754_init`); if schema has evolved, new migrations must be generated carefully

---

## Database Schema Key Entities

Central entities in `backend/prisma/schema.prisma`:
- `Rat` — RAT document header (owner, dates, status)
- `ActividadTratamiento` — treatment activity (FK to Rat, versioned)
- `ActividadVersion` — versioning + workflow states: `BORRADOR → EN_REVISION → APROBADA → VIGENTE`
- `Activo` — information asset with CIA scoring + calculated value
- `OrgDependencia` / `OrgSubdireccion` — organizational hierarchy (IESS structure)
- `User` — has `RoleCode`, optional `dependenciaId`/`subdireccionId` for ABAC scoping
- `AuditLog` — stores before/after JSON for all significant mutations

---

## Environment & Configuration

- `.env.dev` / `.env.dev.example` — dev environment (DB URL, JWT secret, ports)
- `.env.prod` / `.env.prod.example` — production overrides
- Containers read env vars from these files via `docker-compose.yml` / `compose.prod.yml`
- Frontend uses `VITE_API_URL` to configure Axios base URL; in dev the Vite proxy rewrites `/api` to `localhost:3000/api`

---

## Code Conventions

- **Language:** Spanish for domain entities, enum values, and database field names; English for framework patterns and generic utilities
- **File naming:** kebab-case filenames (`auth.service.ts`), PascalCase exports
- **API prefix:** all endpoints under `/api` (set globally in `backend/src/main.ts`)
- **Styling:** Global CSS in `frontend/src/styles.css` combined with Tailwind utility classes inline — no CSS Modules
- **Comments:** Minimal; domain logic comments in Spanish where present
