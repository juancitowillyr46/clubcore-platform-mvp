# ClubCore Platform MVP

MVP frontend basado en `Sakai (PrimeNG)` para construir una plataforma SaaS multi-tenant orientada a clubes.

## Objetivo del MVP

Validar y operar el flujo inicial de onboarding:

- Registro del usuario administrador.
- Registro del club (tenant).
- Confirmación por email y creación de tenant post-confirmación.

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
- Ejecutar creación de tenant **post-confirmación de email**.
- En esta fase MVP se usa `RPC` en callback (`create_tenant_after_confirmation`).

## Flujo recomendado de onboarding

1. Frontend ejecuta `supabase.auth.signUp(...)` con metadata (`full_name`, `club_name`).
2. Usuario confirma email.
3. En `/auth/callback`, frontend valida sesión confirmada.
4. Frontend llama RPC `create_tenant_after_confirmation`.
5. RPC crea `profile`, `club`, `club_members` con lógica transaccional e idempotente.

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
npx npm install
```

Si clonaste sin submódulos:

```bash
git submodule update --init --recursive
```

## Desarrollo local

```bash
npx ng serve --port 3000
```

App disponible en:

- `http://localhost:3000`

## Scripts útiles

- `npx ng serve --port 3000`: levanta servidor de desarrollo.
- `npx ng build`: compila build de producción.
- `npx ng test`: ejecuta pruebas.
- `npx npm run format`: formatea archivos compatibles.

## Estado actual

- Registro admin + club implementado en UI.
- Validaciones y alertas con PrimeNG.
- Diseño responsive para mobile y desktop.
- Integración real con Supabase Auth en register.
- Callback `/auth/callback` implementado.
- Inicialización de tenant vía RPC `create_tenant_after_confirmation`.
