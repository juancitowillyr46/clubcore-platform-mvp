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
-- 6) RLS
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.system_admins enable row level security;
alter table public.venues enable row level security;
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
- [x] Flujo validado end-to-end.
- [ ] Tests básicos de integración/documentados.
