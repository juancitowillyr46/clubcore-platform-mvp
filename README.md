# ClubCore Platform MVP

MVP frontend basado en `Sakai (PrimeNG)` para construir una plataforma SaaS multi-tenant orientada a clubes.

## Objetivo del MVP

Validar el flujo inicial de onboarding:

- Registro del usuario administrador.
- Registro del club (tenant).
- Preparación para integración con Supabase + Edge Functions.

Actualmente el registro está implementado con **datos mock** para avanzar rápido en frontend.

## Stack

- Angular 21
- PrimeNG 21 (template Sakai)
- Tailwind CSS 4
- TypeScript

## Arquitectura funcional (referencia MPV-Club)

Modelo multi-tenant recomendado:

- `profiles`: datos editables del usuario autenticado.
- `clubs`: tenant del cliente.
- `club_members`: pertenencia y rol (`CLUB_ADMIN`, `STAFF`), con regla 1 usuario = 1 club.
- `system_admins`: administración global separada.

Decisión clave:

- No usar trigger automático en `auth.users`.
- Ejecutar creación de tenant **post-confirmación de email** mediante Edge Function (`/create-tenant`).

## Flujo recomendado de onboarding

1. Frontend ejecuta `supabase.auth.signUp(...)` con metadata (`full_name`, `club_name`).
2. Usuario confirma email.
3. En `/auth/callback`, frontend valida sesión confirmada.
4. Frontend llama Edge Function `/create-tenant` con `access token`.
5. Edge Function crea `profile`, `club`, `club_members` (y opcionalmente email de bienvenida).

## Estructura frontend (MVP)

Se usa estructura simple por features:

```text
src/app/
├── core/
├── features/
│   └── registration/
│       ├── models/
│       ├── services/
│       └── pages/
├── layout/
└── pages/
```

## Requisitos

- Node `20.19.0` (recomendado)
- npm `10+`
- Git con submodules habilitados

## Instalación

```bash
git clone --recurse-submodules https://github.com/juancitowillyr46/clubcore-platform-mvp.git
cd clubcore-platform-mvp
nvm use 20.19.0
npm install
```

Si clonaste sin submódulos:

```bash
git submodule update --init --recursive
```

## Desarrollo local

```bash
npm start
```

App disponible en:

- `http://localhost:4200`

## Scripts útiles

- `npm start`: levanta servidor de desarrollo.
- `npm run build`: compila build de producción.
- `npm test`: ejecuta pruebas.
- `npm run format`: formatea archivos compatibles.

## Estado actual

- Registro admin + club implementado en UI.
- Validaciones y alertas con PrimeNG.
- Diseño responsive para mobile y desktop.
- Persistencia aún mock (sin Supabase real en frontend).
