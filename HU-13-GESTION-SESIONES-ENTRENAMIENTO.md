# HU-13: Gestión de Sesiones de Entrenamiento

## Historia de Usuario
Como administrador del club,  
quiero crear una sesión de entrenamiento para un equipo en una fecha y lugar determinado,  
para planificar el trabajo deportivo y consultarlo en un listado general.

## Alcance MVP
- Crear sesión.
- Editar sesión.
- Ver sesiones en listado.
- Guardar en base de datos.
- Estado inicial automático.
- Cálculo automático de duración.

No incluido en esta HU:
- Convocados.
- Tareas por sesión.
- Integración con calendario externo.
- Mensajería/WhatsApp.

## Campos de la sesión
- `title` (requerido)
- `start_date` (requerido)
- `end_date` (requerido; por defecto igual a `start_date`)
- `start_time` (requerido)
- `end_time` (requerido)
- `team_id` (requerido)
- `location_id` (requerido)
- `coach_id` (opcional)
- `duration_minutes` (automático, no editable)
- `status` (automático = `PROGRAMMED`)

## Reglas de Negocio
1. La hora fin debe ser mayor que la hora inicio (considerando fecha inicio/fin).
2. La duración se calcula automáticamente: `end_datetime - start_datetime`.
3. La sesión se crea siempre con estado inicial `PROGRAMMED`.
4. Solo usuarios autenticados con membresía en el club pueden listar/crear/editar.
5. El listado se restringe a sesiones del club del usuario autenticado.

## Criterios de Aceptación
1. Permite registrar fecha inicio, fecha fin, hora inicio, hora fin, título, equipo, ubicación y entrenador opcional.
2. Muestra selector de hora en formato 24h para hora inicio y hora fin.
3. Impide guardar cuando faltan campos obligatorios.
4. Impide guardar si la hora/fecha de fin no es mayor que la de inicio.
5. Guarda la sesión en Supabase.
6. Muestra la sesión en el listado general.
7. Permite editar la sesión.

## UX/UI (implementado)
- Vista en cards con información clave:
  - título
  - fecha + rango horario
  - equipo
  - ubicación
  - duración
- Filtros de búsqueda y ordenamiento.
- Paginación.
- Formulario en `p-dialog`.
- Diseño responsive (mobile-first).

## Integración técnica (implementada)
- `TrainingSessionsService` conectado a Supabase:
  - `list()`
  - `create()`
  - `update()`
- Fuente de catálogos:
  - equipos: `TeamsService`
  - sedes: `VenuesService`
  - entrenadores: `TrainersService`
- Restricción por club mediante `club_members` + sesión activa.

## Definition of Done
- Flujo crear/editar/listar operativo.
- Validaciones funcionales aplicadas.
- Integración con Supabase activa.
- SQL y RLS documentados en `PLAN-REGISTRO-SUPABASE.md`.
