# HU-12: Gestión de Equipos

## Historia de Usuario
Como administrador del club,  
quiero crear y gestionar equipos con su sede, categoría y cuerpo técnico,  
para organizar la operación deportiva del club desde una interfaz simple y mobile-first.

## Campos del Equipo
- `name` (requerido)
- `venue_id` (requerido)
- `category_id` (requerido)
- `head_trainer_id` (requerido)
- `logo_url` (opcional)
- `staff_assignments[]` (opcional)

## Reglas de Negocio
- Si existe una sola sede activa, se asigna automáticamente.
- Si existe una sola categoría activa, se asigna automáticamente.
- Si existe un solo entrenador activo, se asigna automáticamente.
- Si hay más de una opción, se muestra `p-select`.
- El cuerpo técnico es opcional, pero:
  - cada fila debe tener técnico + rol;
  - el técnico principal no puede estar en el cuerpo técnico;
  - no se permite repetir técnico en el cuerpo técnico.

## Criterios de Aceptación
1. Listar equipos en cards mostrando:
   - nombre,
   - sede,
   - categoría.
2. Crear equipo con validaciones obligatorias.
3. Editar equipo existente.
4. Dar de baja lógica (inactivo, sin borrado físico).
5. UX responsive usable en móvil.
6. Uso de `p-select` para selecciones.
7. El listado de sedes, categorías y entrenadores proviene de datos activos del backend.

## Criterios Técnicos (MVP actual)
- Persistencia de equipos: Supabase (`teams` + `team_staff_members`).
- Catálogos de referencia:
  - Sedes activas desde `VenuesService` (Supabase).
  - Categorías activas desde `CategoriesService` (Supabase).
  - Entrenadores activos desde `TrainersService` (Supabase).

## Definition of Done
- Flujo de crear/editar/dar de baja probado.
- Validaciones de negocio implementadas.
- Experiencia mobile validada.
- Menú y ruta de `Equipos` disponibles.
