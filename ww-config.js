export default {
  editor: {
    label: { en: 'Gantt Nextpulse' },
    icon: 'chart',
  },
  properties: {
    tasks: {
      label: { en: 'Tasks' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [
        { id: 1, name: 'Example task', status: 'In Progress', start: '2026-10-01', end: '2026-10-20', progress: 40, assignee: 'Laurent' },
      ],
      /* Bind this to your Supabase tasks collection */
    },
    nameField: { label: { en: 'Name field' }, type: 'Text', section: 'settings', defaultValue: 'name' },
    startField: { label: { en: 'Start field' }, type: 'Text', section: 'settings', defaultValue: 'created_at' },
    endField: { label: { en: 'End / due date field' }, type: 'Text', section: 'settings', defaultValue: 'due_date' },
    progressField: { label: { en: 'Progress field' }, type: 'Text', section: 'settings', defaultValue: 'progress' },
    statusField: { label: { en: 'Status field' }, type: 'Text', section: 'settings', defaultValue: 'status' },
    assigneeField: { label: { en: 'Assignee field' }, type: 'Text', section: 'settings', defaultValue: 'assignee' },
    defaultSpanDays: { label: { en: 'Days shown when no due date' }, type: 'Number', section: 'settings', defaultValue: 14 },
  },
  triggerEvents: [{ name: 'task-click', label: { en: 'On task click' }, event: { task: {} } }],
};
