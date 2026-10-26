# Gantt Nextpulse – WeWeb component

Copy of the Nexus Gantt chart, without subtasks, set up for the Nextpulse ERP `tasks` table.

- `Tasks`: bind your Supabase `tasks` collection. Bars run from `created_at` (or `start_date` if you add one) to `due_date`.
- Field names, colours, zoom and sizes are editable properties.
- Events: `task-click`, `task-progress-change`, `progress-saved`, `progress-save-error`.
- Dragging a bar's progress saves to the Supabase `tasks` table automatically (toggle in settings).

Version: see `package.json` (1.0.0).

## Editing dates (1.1.0)
Drag a bar to move it, or drag its left/right edge to change the start / end date. Saved to `tasks` through WeWeb's Supabase connection (`Field: start date` default `created_at`, `Field: end date` default `due_date`). Toggle with `Allow dragging bars to change start / end dates`.
Events: `task-dates-change` (while saving), `dates-saved`.
Start date uses the `created_at` column, so moving a bar overwrites it.

## Double click
Double-click a bar or a task name: sets the component variable `selectedTaskId` (the task id) and `selectedItem` (the row), and fires `task-double-click` (value = the row). Add a workflow on that event to open your popup, and read `selectedTaskId` inside it.
