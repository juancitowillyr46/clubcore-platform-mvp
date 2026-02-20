# Plan de Implementación: Registro Admin + Club (Supabase)

Este documento aterriza tareas concretas para la HU:

> Como usuario interesado, quiero registrarme y crear automáticamente mi club para comenzar a utilizar el sistema de inmediato.

## 1) Alcance funcional

- Registro con Supabase Auth (`email`, `password`).
- Login con Supabase Auth (`email`, `password`).
- Confirmación de email obligatoria.
- Post-confirmación:
  - Crear `profiles`.
  - Crear `clubs`.
  - Crear `club_members` con rol `CLUB_ADMIN`.
- Onboarding obligatorio para completar datos del administrador y club.
- Evitar inconsistencias (proceso transaccional en BD).
- Usuario autenticado al finalizar callback.

## 2) Tareas concretas (frontend)

## 2.1 Register (`/auth/register`)

1. Integrar `SupabaseService` para registro real.
2. En submit:
   - Validar email/password/clubName.
   - Ejecutar `supabase.auth.signUp(...)`.
   - Guardar `full_name` y `club_name` en metadata (`options.data`).
3. Mostrar estado:
   - Éxito: "Revisa tu correo para confirmar tu cuenta".
   - Error: alerta PrimeNG (`p-message`).
4. No insertar `clubs` ni `club_members` desde frontend.

## 2.2 Callback (`/auth/callback`)

1. Crear página `AuthCallbackPage`.
2. Al cargar:
   - Obtener sesión (`supabase.auth.getSession()`).
   - Validar `email_confirmed_at`.
3. Si confirmado:
   - Llamar RPC o Edge Function para crear tenant.
   - Manejar idempotencia (si ya existe, no duplicar).
4. Si éxito:
   - Redirigir a dashboard.
5. Si error:
   - Mostrar mensaje claro y opción de reintentar.

## 2.3 Rutas

1. Agregar `/auth/callback` en `src/app/pages/auth/auth.routes.ts`.
2. Mantener `/auth/register` activo.
3. Crear `/onboarding/profile-club`.
4. Proteger dashboard con guard de onboarding completo.
5. Bloquear `/auth/login` y `/auth/register` con guard de invitado (`guestOnly`).

## 2.4 Login (`/auth/login`)

1. Integrar `supabase.auth.signInWithPassword(...)`.
2. Validar email/password en frontend.
3. Mostrar errores con `p-message`.
4. Redirigir:
   - onboarding incompleto -> `/onboarding/profile-club`
   - onboarding completo -> `/`

## 2.5 Onboarding (`/onboarding/profile-club`)

1. Formulario obligatorio:
   - nombre administrador
   - teléfono club
   - dirección club
   - foto/logo club
2. Guardar foto/logo en Storage (`club-assets`).
3. Persistir:
   - `profiles.full_name`
   - `clubs.phone`, `clubs.address`, `clubs.photo_url`

## 2.6 Sedes (`/venues`)

1. Integrar módulo de sedes con Supabase (sin mocks).
2. CRUD:
   - Listar sedes del club autenticado.
   - Crear sede.
   - Editar sede.
   - Dar de baja lógica (`is_active = false`).
3. Regla de negocio:
   - Solo una sede activa por defecto por club.
4. UX:
   - Cards responsive (mobile first).
   - Búsqueda, ordenamiento y paginación.
   - Confirmación de baja individual y masiva.

## 2.7 Categorías (`/categories`)

1. Implementar módulo de categorías con datos mock para acelerar HU-10.
2. CRUD:
   - Listar categorías (`name`, `ageMin`, `ageMax`, `isActive`).
   - Crear categoría validando `ageMin <= ageMax`.
   - Editar categoría existente.
   - Dar de baja lógica (`is_active = false`).
3. Regla recomendada:
   - Evitar solapamiento de rangos activos.
4. UX:
   - Cards responsive (mobile first).
   - Búsqueda por nombre, ordenamiento y paginación.
   - Confirmación de baja individual y masiva.

## 2.8 Entrenadores (`/trainers`)

1. Integrar módulo de entrenadores con Supabase (sin mocks).
2. CRUD:
   - Listar entrenadores del club autenticado.
   - Crear entrenador.
   - Editar entrenador existente.
   - Dar de baja lógica (`is_active = false`).
3. Campos:
   - `first_name` (requerido).
   - `last_name`, `middle_name`, `email`, `phone`, `about`.
   - `photo_url` (MVP actual en Data URL/base64).
4. UX:
   - Cards responsive (mobile first).
   - Búsqueda por nombre, ordenamiento y paginación.
   - Confirmación de baja individual y masiva.

## 2.9 Equipos (`/teams`)

1. Integrar módulo de equipos con Supabase (sin mocks).
2. CRUD:
   - Listar equipos del club autenticado.
   - Crear equipo con sede, categoría y entrenador principal.
   - Editar equipo existente.
   - Dar de baja lógica (`is_active = false`, `deleted_at`).
3. Relacional:
   - Tabla `teams` como entidad principal.
   - Tabla `team_staff_members` para cuerpo técnico adicional con rol.
4. Reglas:
   - Si existe una sola sede/categoría/entrenador activo, autoseleccionar.
   - Si hay más de una opción, usar `p-select`.
   - Técnico principal no puede estar en cuerpo técnico.
   - No repetir técnico en cuerpo técnico del mismo equipo.

## 2.10 Sesiones de entrenamiento (`/training-sessions`)

1. Integrar módulo de sesiones con Supabase (sin mocks).
2. Funcionalidades:
   - Listar sesiones del club autenticado.
   - Crear sesión.
   - Editar sesión.
3. Campos requeridos:
   - `title`
   - `startDate`
   - `endDate`
   - `startTime`
   - `endTime`
   - `teamId`
   - `locationId`
4. Campo opcional:
   - `coachId`
5. Reglas:
   - `durationMinutes` se calcula automáticamente (`end - start`).
   - `end` debe ser mayor que `start`.
   - Estado inicial en BD: `PROGRAMMED`.
6. Catálogos:
   - Equipos activos desde `TeamsService`.
   - Sedes activas desde `VenuesService`.
   - Entrenadores activos desde `TrainersService`.

## 3) Tareas concretas (backend Supabase)

1. Crear tablas: `profiles`, `clubs`, `club_members`, `system_admins`.
2. Agregar constraints y llaves foráneas.
3. Definir `ON DELETE CASCADE` en relaciones por usuario:
   - `profiles.id -> auth.users(id) on delete cascade`
   - `club_members.user_id -> auth.users(id) on delete cascade`
4. Crear función transaccional `create_tenant_after_confirmation(...)`.
5. Habilitar RLS y políticas base.
6. (Opcional) Exponer vía Edge Function `/create-tenant`.
7. Ajustar FK de `clubs.created_by` para permitir eliminar usuarios de auth sin bloquear:
   - `on delete set null` (y columna nullable).

## 4) Secuencia SQL sugerida (orden de ejecución)

Ejecutar en Supabase SQL Editor, en este orden.

```sql
-- 0) Extensión para UUIDs (si no existe)
create extension if not exists pgcrypto;
```

```sql
-- 1) Tabla profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
```

```sql
-- 2) Tabla clubs
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  plan_type text not null default 'TRIAL',
  max_users integer not null default 5,
  is_active boolean not null default true,
  phone text default '',
  address text default '',
  photo_url text default '',
  created_at timestamptz not null default now()
);
```

```sql
-- 3) Tabla club_members
create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  role text not null check (role in ('CLUB_ADMIN', 'STAFF')),
  created_at timestamptz not null default now(),
  unique(user_id)
);
```

```sql
-- 4) Tabla system_admins
create table if not exists public.system_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
```

```sql
-- 5) Índices recomendados
create index if not exists idx_club_members_club_id on public.club_members(club_id);
create index if not exists idx_clubs_created_by on public.clubs(created_by);
```

```sql
-- 5.1) Tabla venues (sucursales/sedes)
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  address text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_venues_club_id on public.venues(club_id);
create unique index if not exists ux_venues_default_per_club
on public.venues(club_id)
where is_default = true and is_active = true;
```

```sql
-- 5.2) Tabla categories (categorías por rango de edad)
create extension if not exists btree_gist;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  age_min integer not null check (age_min >= 0),
  age_max integer not null check (age_max >= age_min),
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_club_id on public.categories(club_id);
create index if not exists idx_categories_club_active on public.categories(club_id, is_active);

-- Evita rangos solapados solo entre categorías activas no eliminadas lógicamente.
alter table public.categories
drop constraint if exists categories_no_overlap_active;

alter table public.categories
add constraint categories_no_overlap_active
exclude using gist (
  club_id with =,
  int4range(age_min, age_max, '[]') with &&
)
where (is_active = true and deleted_at is null);
```

```sql
-- 5.3) Tabla trainers
create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  middle_name text not null default '',
  email text,
  phone text,
  photo_url text,
  about text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trainers_club_id on public.trainers(club_id);
create index if not exists idx_trainers_club_active on public.trainers(club_id, is_active);
create index if not exists idx_trainers_name on public.trainers(first_name, last_name, middle_name);
```

```sql
-- 5.4) Tablas teams y team_staff_members
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  venue_id uuid not null references public.venues(id),
  category_id uuid not null references public.categories(id),
  head_trainer_id uuid not null references public.trainers(id),
  logo_url text,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_staff_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  trainer_id uuid not null references public.trainers(id),
  role text not null,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teams_club_id on public.teams(club_id);
create index if not exists idx_teams_club_active on public.teams(club_id, is_active);
create index if not exists idx_team_staff_team_id on public.team_staff_members(team_id);
create index if not exists idx_team_staff_trainer_id on public.team_staff_members(trainer_id);

create unique index if not exists ux_team_staff_unique_active
on public.team_staff_members(team_id, trainer_id)
where deleted_at is null;
```

```sql
-- 5.5) Trigger: técnico principal no puede estar en cuerpo técnico
create or replace function public.validate_team_staff_member()
returns trigger
language plpgsql
as $$
declare
  v_head_trainer_id uuid;
begin
  select t.head_trainer_id
    into v_head_trainer_id
  from public.teams t
  where t.id = new.team_id;

  if v_head_trainer_id is null then
    raise exception 'Team not found for team_staff_members.';
  end if;

  if new.trainer_id = v_head_trainer_id then
    raise exception 'Head trainer cannot be part of team staff members.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_team_staff_member on public.team_staff_members;
create trigger trg_validate_team_staff_member
before insert or update on public.team_staff_members
for each row
execute function public.validate_team_staff_member();
```

```sql
-- 6) RLS
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.system_admins enable row level security;
alter table public.venues enable row level security;
alter table public.categories enable row level security;
alter table public.trainers enable row level security;
alter table public.teams enable row level security;
alter table public.team_staff_members enable row level security;
```

```sql
-- 7) Políticas mínimas de lectura para miembros del club
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "clubs_select_member" on public.clubs;
create policy "clubs_select_member"
on public.clubs
for select
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = clubs.id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "clubs_update_member" on public.clubs;
create policy "clubs_update_member"
on public.clubs
for update
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = clubs.id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = clubs.id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "club_members_select_own" on public.club_members;
create policy "club_members_select_own"
on public.club_members
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "venues_select_member" on public.venues;
create policy "venues_select_member"
on public.venues
for select
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = venues.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "venues_insert_member" on public.venues;
create policy "venues_insert_member"
on public.venues
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = venues.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "venues_update_member" on public.venues;
create policy "venues_update_member"
on public.venues
for update
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = venues.club_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = venues.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "categories_select_member" on public.categories;
create policy "categories_select_member"
on public.categories
for select
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = categories.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "categories_insert_member" on public.categories;
create policy "categories_insert_member"
on public.categories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = categories.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "categories_update_member" on public.categories;
create policy "categories_update_member"
on public.categories
for update
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = categories.club_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = categories.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "trainers_select_member" on public.trainers;
create policy "trainers_select_member"
on public.trainers
for select
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = trainers.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "trainers_insert_member" on public.trainers;
create policy "trainers_insert_member"
on public.trainers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = trainers.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "trainers_update_member" on public.trainers;
create policy "trainers_update_member"
on public.trainers
for update
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = trainers.club_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = trainers.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "teams_select_member" on public.teams;
create policy "teams_select_member"
on public.teams
for select
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = teams.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "teams_insert_member" on public.teams;
create policy "teams_insert_member"
on public.teams
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = teams.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "teams_update_member" on public.teams;
create policy "teams_update_member"
on public.teams
for update
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = teams.club_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = teams.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "team_staff_select_member" on public.team_staff_members;
create policy "team_staff_select_member"
on public.team_staff_members
for select
to authenticated
using (
  exists (
    select 1
    from public.teams t
    join public.club_members cm on cm.club_id = t.club_id
    where t.id = team_staff_members.team_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "team_staff_insert_member" on public.team_staff_members;
create policy "team_staff_insert_member"
on public.team_staff_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.teams t
    join public.club_members cm on cm.club_id = t.club_id
    where t.id = team_staff_members.team_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "team_staff_update_member" on public.team_staff_members;
create policy "team_staff_update_member"
on public.team_staff_members
for update
to authenticated
using (
  exists (
    select 1
    from public.teams t
    join public.club_members cm on cm.club_id = t.club_id
    where t.id = team_staff_members.team_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teams t
    join public.club_members cm on cm.club_id = t.club_id
    where t.id = team_staff_members.team_id
      and cm.user_id = auth.uid()
  )
);
```

```sql
-- 7.1) Storage (bucket público club-assets)
-- Crear bucket desde panel Storage: club-assets (public = true)

drop policy if exists "club_assets_public_read" on storage.objects;
create policy "club_assets_public_read"
on storage.objects
for select
to public
using (bucket_id = 'club-assets');

drop policy if exists "club_assets_auth_upload" on storage.objects;
create policy "club_assets_auth_upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'club-assets');

drop policy if exists "club_assets_auth_update" on storage.objects;
create policy "club_assets_auth_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'club-assets')
with check (bucket_id = 'club-assets');
```

```sql
-- 8) Función transaccional para crear tenant post-confirmación
create or replace function public.create_tenant_after_confirmation(
  p_user_id uuid,
  p_full_name text,
  p_club_name text
)
returns table(profile_id uuid, club_id uuid, membership_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_club_id uuid;
  v_membership_id uuid;
begin
  -- Idempotencia: si el usuario ya pertenece a un club, devuelve datos existentes
  select cm.id, cm.club_id into v_membership_id, v_club_id
  from public.club_members cm
  where cm.user_id = p_user_id
  limit 1;

  if v_membership_id is not null then
    v_profile_id := p_user_id;
    return query select v_profile_id, v_club_id, v_membership_id;
    return;
  end if;

  insert into public.profiles (id, full_name)
  values (p_user_id, p_full_name)
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.clubs (name, created_by, plan_type, max_users, is_active)
  values (p_club_name, p_user_id, 'TRIAL', 5, true)
  returning id into v_club_id;

  insert into public.club_members (user_id, club_id, role)
  values (p_user_id, v_club_id, 'CLUB_ADMIN')
  returning id into v_membership_id;

  v_profile_id := p_user_id;
  return query select v_profile_id, v_club_id, v_membership_id;
end;
$$;
```

```sql
-- 9) Permiso para invocar la función (si usarás RPC con usuario autenticado)
grant execute on function public.create_tenant_after_confirmation(uuid, text, text) to authenticated;
```

```sql
-- 10) Tabla training_sessions (HU-13)
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'training_session_status'
      and n.nspname = 'public'
  ) then
    create type public.training_session_status as enum ('PROGRAMMED');
  end if;
end $$;

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null check (length(trim(title)) >= 3),
  start_date date not null,
  end_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  team_id uuid not null references public.teams(id),
  location_id uuid not null references public.venues(id),
  coach_id uuid null references public.trainers(id),
  status public.training_session_status not null default 'PROGRAMMED',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'training_sessions_time_range_chk'
  ) then
    alter table public.training_sessions
      add constraint training_sessions_time_range_chk
      check ((end_date + end_time) > (start_date + start_time));
  end if;
end $$;

create index if not exists idx_training_sessions_club_id on public.training_sessions(club_id);
create index if not exists idx_training_sessions_team_id on public.training_sessions(team_id);
create index if not exists idx_training_sessions_location_id on public.training_sessions(location_id);
create index if not exists idx_training_sessions_coach_id on public.training_sessions(coach_id);
create index if not exists idx_training_sessions_start_date on public.training_sessions(start_date);
create index if not exists idx_training_sessions_deleted_at on public.training_sessions(deleted_at);

drop trigger if exists trg_training_sessions_set_updated_at on public.training_sessions;
create trigger trg_training_sessions_set_updated_at
before update on public.training_sessions
for each row
execute function public.set_updated_at();
```

```sql
-- 11) RLS/policies para training_sessions
alter table public.training_sessions enable row level security;

drop policy if exists training_sessions_select on public.training_sessions;
drop policy if exists training_sessions_insert on public.training_sessions;
drop policy if exists training_sessions_update on public.training_sessions;
drop policy if exists training_sessions_delete on public.training_sessions;

create policy training_sessions_select
on public.training_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = training_sessions.club_id
      and cm.user_id = auth.uid()
  )
);

create policy training_sessions_insert
on public.training_sessions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.club_members cm
    where cm.club_id = training_sessions.club_id
      and cm.user_id = auth.uid()
  )
);

create policy training_sessions_update
on public.training_sessions
for update
to authenticated
using (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = training_sessions.club_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_members cm
    where cm.club_id = training_sessions.club_id
      and cm.user_id = auth.uid()
  )
);

create policy training_sessions_delete
on public.training_sessions
for delete
to authenticated
using (false);
```

## 5) Notas sobre cascade delete (clave)

- `ON DELETE CASCADE` en `profiles` y `club_members` evita registros huérfanos cuando se elimina un usuario de `auth.users`.
- Esto es importante para pruebas repetibles y limpieza de datos en MVP.
- Para `clubs.created_by`, se recomienda `ON DELETE SET NULL` para no bloquear eliminación de usuario ni borrar clubs por accidente.

## 6) Validaciones mínimas (DoD)

1. Caso feliz:
   - Usuario se registra.
   - Confirma email.
   - Callback crea tenant.
   - Queda autenticado y redirigido.
2. Caso error:
   - Si falla creación de tenant, no quedan inserciones parciales.
3. Reintento callback:
   - No duplica `clubs`/`club_members` (idempotencia).
4. Prueba de eliminación:
   - Al borrar usuario en `auth.users`, se eliminan `profiles` y `club_members` relacionados por cascade.

## 7) Checklist de entrega

- [x] Register conectado a Supabase Auth.
- [x] Login conectado a Supabase Auth.
- [x] Auth callback implementado.
- [x] Onboarding obligatorio implementado.
- [x] Función transaccional desplegada en BD.
- [x] RLS/policies mínimas activas.
- [x] Cascade delete aplicado en relaciones por usuario.
- [x] Ajuste `clubs.created_by` a `on delete set null`.
- [x] Storage integrado para foto/logo del club.
- [x] Módulo de sedes integrado con Supabase (sin datos mock).
- [x] SQL + RLS de `venues` aplicado.
- [x] HU-10 Categorías implementada en frontend con datos mock.
- [x] SQL + RLS de `categories` documentado para ejecución en Supabase.
- [x] HU-11 Entrenadores implementada en frontend.
- [x] Módulo `trainers` integrado con Supabase (sin mocks).
- [x] SQL + RLS de `trainers` documentado para ejecución en Supabase.
- [x] Módulo `teams` integrado con Supabase (sin mocks).
- [x] Esquema relacional `teams` + `team_staff_members` definido.
- [x] SQL + RLS de `teams` documentado para ejecución en Supabase.
- [x] Módulo `training-sessions` integrado con Supabase (sin mocks).
- [x] SQL + RLS de `training_sessions` documentado para ejecución en Supabase.
- [x] Selector de hora en 24h para sesión (inicio/fin).
- [x] Flujo validado end-to-end.
- [ ] Tests básicos de integración/documentados.
