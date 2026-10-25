# Gantt Nextpulse

Static Gantt chart of the Nextpulse company tasks (no subtasks), read from the Nextpulse ERP Supabase database (`public.tasks`, company id 1).

- Bars run from `created_at` to `due_date`; progress is shown inside each bar.
- Tasks without a due date are drawn hatched, 14 days from creation.
- Data snapshot lives in `data/tasks.json`; refresh it by re-exporting from Supabase.

Open `index.html` through any static server (e.g. `npx serve .`) or GitHub Pages.
