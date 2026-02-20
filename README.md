# ClubCore Platform MVP

MVP frontend basado en `Sakai (PrimeNG)` para construir una plataforma SaaS multi-tenant orientada a clubes.

## Objetivo del MVP

Validar y operar el flujo inicial de onboarding:

- Registro del usuario administrador.
- Registro del club (tenant).
- Confirmación por email y creación de tenant post-confirmación.
- Login autenticado con redirección según estado de onboarding.
- Onboarding obligatorio para completar datos mínimos del administrador y club.

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
6. Usuario pasa por `/onboarding/profile-club` si faltan datos obligatorios.
7. Solo con onboarding completo accede a dashboard.

## Estructura frontend (MVP)

Se usa estructura simple por features:

```text
src/app/
├── core/
│   └── guards/
├── features/
│   ├── onboarding/
│   │   ├── models/
│   │   ├── pages/
│   │   └── services/
│   ├── registration/
│   │   ├── models/
│   │   ├── services/
│   │   └── pages/
│   ├── categories/
│   │   ├── models/
│   │   ├── services/
│   │   └── pages/
│   ├── trainers/
│   │   ├── models/
│   │   ├── services/
│   │   └── pages/
│   ├── teams/
│   │   ├── models/
│   │   ├── services/
│   │   └── pages/
│   ├── training-sessions/
│   │   ├── models/
│   │   ├── services/
│   │   └── pages/
│   └── venues/
│       ├── models/
│       ├── pages/
│       └── services/
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
- Login integrado con Supabase (`signInWithPassword`).
- Validaciones y alertas con PrimeNG.
- Diseño responsive para mobile y desktop.
- Integración real con Supabase Auth en register.
- Callback `/auth/callback` implementado.
- Inicialización de tenant vía RPC `create_tenant_after_confirmation`.
- Guard para bloquear `login/register` con sesión activa.
- Guard para exigir onboarding antes de entrar al dashboard.
- Onboarding `/onboarding/profile-club` con:
  - nombre administrador
  - teléfono club
  - dirección club
  - foto/logo en Supabase Storage (`club-assets`)
- Módulo `Sedes` (`/venues`) conectado a Supabase:
  - listado en cards
  - crear/editar
  - baja lógica (`is_active`)
  - una sola sede activa por defecto por club
- Módulo `Categorías` (`/categories`) conectado a Supabase:
  - listado en cards
  - crear/editar
  - baja lógica (`is_active`)
  - validación de rango (`edad mínima <= edad máxima`)
  - validación de no solapamiento en categorías activas
- Módulo `Entrenadores` (`/trainers`) conectado a Supabase:
  - listado en cards
  - crear/editar
  - baja lógica (`is_active`)
  - foto en `photo_url` (actualmente Data URL/base64)
  - búsqueda, ordenamiento y paginación
- Módulo `Equipos` (`/teams`) conectado a Supabase:
  - listado en cards
  - crear/editar
  - baja lógica (`is_active` + `deleted_at`)
  - cuerpo técnico en tabla relacional `team_staff_members`
  - validación: técnico principal no puede estar en cuerpo técnico
- Módulo `Sesiones de entrenamiento` (`/training-sessions`) conectado a Supabase:
  - listado en cards
  - crear/editar
  - duración calculada automáticamente (`hora fin - hora inicio`)
  - estado inicial `PROGRAMMED`
  - campos con validación obligatoria:
    - título
    - fecha inicio / fecha fin
    - hora inicio / hora fin (selector de hora en formato 24h)
    - equipo
    - ubicación
  - entrenador asignado opcional
  - catálogos dinámicos desde backend:
    - equipos activos
    - sedes activas
    - entrenadores activos
