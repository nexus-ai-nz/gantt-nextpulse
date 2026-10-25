# Gantt Nextpulse – WeWeb component

Copy of the Nexus Gantt chart, without subtasks, set up for the Nextpulse ERP `tasks` table.

- `Tasks`: bind your Supabase `tasks` collection. Bars run from `created_at` (or `start_date` if you add one) to `due_date`.
- Field names, colours, zoom and sizes are editable properties.
- Events: `task-click`, `task-progress-change`, `progress-saved`, `progress-save-error`.
- Dragging a bar's progress saves to the Supabase `tasks` table automatically (toggle in settings).

Version: see `package.json` (1.0.0).
