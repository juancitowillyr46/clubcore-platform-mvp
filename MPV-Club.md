🎯 Arquitectura Recomendada (Resumen Ejecutivo)
🏗 1️⃣ Esquema de Base de Datos (Multi-Tenant SaaS Correcto)
🔐 auth.users (Interna Supabase)

Maneja autenticación.

Guarda metadata temporal (raw_user_meta_data).

NO se modifica directamente.

👤 profiles

Extiende al usuario autenticado.

profiles
- id uuid PK (references auth.users.id)
- full_name text
- avatar_url text
- created_at timestamp


✔ Vive en tu schema público
✔ Se usa para datos editables del usuario

🏢 clubs (Tenant)
clubs
- id uuid PK
- name text
- created_by uuid
- plan_type text
- max_users integer
- is_active boolean
- created_at timestamp


✔ Representa al cliente (club)
✔ Permite monetización futura
✔ Permite límites por plan

🔗 club_members (Núcleo Multi-Tenant)
club_members
- id uuid PK
- user_id uuid
- club_id uuid
- role text ('CLUB_ADMIN','STAFF')
- created_at timestamp
- UNIQUE(user_id)


✔ Controla pertenencia
✔ Controla roles
✔ Garantiza 1 usuario = 1 club

👑 system_admins (Global)
system_admins
- user_id uuid PK
- created_at timestamp


✔ SuperAdmin separado del modelo multi-tenant
✔ Arquitectura limpia

🧠 Decisión Arquitectónica Clave

NO usar trigger automático al registrarse.

¿Por qué?

Porque el usuario puede no confirmar email
→ generarías clubes fantasma.

🚀 Flujo Profesional Recomendado
🔹 Paso 1 – Registro

Frontend:

supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name,
      club_name
    }
  }
});


✔ Se crea auth.users
✔ Se guarda metadata temporal
✔ Se envía email de confirmación

🔹 Paso 2 – Confirmación de Email

Usuario hace clic en el enlace.
Supabase redirige a:

/auth/callback

🔹 Paso 3 – En Callback verificas sesión
const { data: { session } } = await supabase.auth.getSession();

if (session?.user?.email_confirmed_at) {
  // Usuario confirmado
}

🔹 Paso 4 – Llamar Edge Function

Desde el frontend llamas:

/create-tenant


Pasando el access token.

🟣 Edge Function hace:

1️⃣ Verifica que email esté confirmado
2️⃣ Crea profile
3️⃣ Crea club (plan TRIAL, max_users=5)
4️⃣ Crea club_members (CLUB_ADMIN)
5️⃣ (Opcional) Envía email bienvenida

Todo usando SERVICE_ROLE_KEY.

🔐 ¿Por qué Edge Function y no Trigger?
Trigger	Edge Function
Se ejecuta siempre	Solo cuando tú decides
Puede crear basura	Evita clubes fantasma
Menos control	Control total
Difícil lógica compleja	Ideal para lógica SaaS

👉 Para SaaS serio → Edge Function post-confirmación.

🎯 Resultado Final

✔ No hay clubes sin confirmar
✔ No hay datos inconsistentes
✔ Flujo limpio
✔ Escalable
✔ Listo para monetización
✔ Compatible con Stripe después
✔ Compatible con límites por plan

🧩 Qué NO estamos usando

❌ Trigger en auth.users
❌ Inserciones desde frontend
❌ Dependencia directa de raw_user_meta_data

🏁 Estado Actual del Proyecto

Tu backend queda:

Multi-tenant correcto

Separación clara de roles

Arquitectura escalable

Seguridad lista para RLS

Onboarding profesional