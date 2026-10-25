# Gantt Nextpulse

WeWeb custom element: Gantt chart of tasks (no subtasks).

## Use in WeWeb
Import this repo as a custom element (version tags: `v1.0.0`). Bind **Tasks** to your Supabase `tasks` collection, then map the field names if yours differ (defaults: `name`, `created_at`, `due_date`, `progress`, `status`, `assignee`). Tasks with no due date are hatched and span 14 days (configurable). Clicking a bar fires the `task-click` event.

## Layout
- `ww-config.js` – element config/properties
- `src/wwElement.vue` – the component
- `demo/` – standalone HTML preview with a snapshot of the Nextpulse tasks
