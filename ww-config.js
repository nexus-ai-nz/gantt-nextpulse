const label = en => ({ en });
const color = (en, defaultValue) => ({ label: label(en), type: 'Color', section: 'style', bindable: true, defaultValue });
const text = (en, defaultValue, section = 'settings') => ({ label: label(en), type: 'Text', section, bindable: true, defaultValue });
const num = (en, defaultValue, options = {}, section = 'style') => ({
  label: label(en),
  type: 'Number',
  section,
  bindable: true,
  defaultValue,
  options: { min: 0, ...options },
});
const toggle = (en, defaultValue, section = 'settings') => ({ label: label(en), type: 'OnOff', section, bindable: true, defaultValue });

export default {
  editor: {
    label: label('Gantt chart'),
    icon: 'chart',
  },
  triggerEvents: [
    { name: 'task-click', label: label('On task click (sets selectedTaskId)'), event: { value: {} } },
    { name: 'task-progress-change', label: label('On task progress change (drag)'), event: { value: { id: 0, progress: 0, previous: 0, row: {} } } },
    { name: 'task-dates-change', label: label('On task dates change (drag)'), event: { value: { id: 0, start: '', end: '', previousStart: '', previousEnd: '', row: {} } } },
    { name: 'dates-saved', label: label('On dates saved (use it to refresh collections)'), event: { value: { id: 0, start: '', end: '' } } },
    { name: 'progress-saved', label: label('On progress saved (use it to refresh collections)'), event: { value: { id: 0, isSubtask: false, progress: 0 } } },
    { name: 'progress-save-error', label: label('On progress save error'), event: { value: { id: 0, isSubtask: false, message: '' } } },
    { name: 'client-filter-change', label: label('On client filter change'), event: { value: '' } },
  ],
  properties: {
    // ---------- Data ----------
    tasks: {
      label: label('Tasks'),
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [
        { id: 5, name: 'Report Formulas', status: 'To Do', created_at: '2025-05-07', due_date: '2025-05-30', progress: 0, priority: 3 },
        { id: 6, name: 'Connect with Hnry', status: 'In Progress', created_at: '2025-05-12', due_date: '2025-06-16', progress: 10, priority: 3 },
        { id: 11, name: 'Testing', status: 'In Progress', created_at: '2025-05-19', due_date: '2025-06-30', progress: 10, priority: 3 },
        { id: 13, name: 'NextPulse Marketing Strategy', status: 'To Do', created_at: '2025-05-19', due_date: '2025-05-31', progress: 0, priority: 3 },
        { id: 14, name: 'Document for Maria at The Networkers', status: 'In Progress', created_at: '2025-05-19', due_date: '2025-05-26', progress: 10, priority: 3 },
        { id: 20, name: 'Intro Video for Maria', status: 'To Do', created_at: '2025-07-15', due_date: '2025-08-15', progress: 0, priority: 3 },
      ],
    },
    clients: {
      label: label('Clients'),
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [
      ],
    },

    // ---------- Field mapping ----------
    clientField: text('Tasks: client id field', 'company_id'),
    clientNameField: text('Tasks: client name field (auto-detected: clients.name, client.name, client_name)', ''),
    clientsIdField: text('Clients: id field', 'id'),
    clientsNameField: text('Clients: name field', 'name'),
    idField: text('Field: id', 'id'),
    nameField: text('Field: name', 'name'),
    statusField: text('Field: status', 'status'),
    startField: text('Field: start date', 'created_at'),
    endField: text('Field: end date', 'due_date'),
    createdField: text('Field: created at (fallback start)', 'created_at'),
    progressField: text('Field: progress (0-100)', 'progress'),
    priorityField: text('Field: priority (1-3)', 'priority'),
    doneStatuses: text('Statuses counted as done (comma separated)', 'done,completed,complete'),
    todoStatuses: text('Statuses counted as to do (comma separated)', 'todo,to do,not started,open,backlog'),

    // ---------- Behaviour ----------
    viewMode: {
      label: label('Zoom'),
      type: 'TextSelect',
      section: 'settings',
      bindable: true,
      defaultValue: 'day',
      options: {
        options: [
          { value: 'day', label: label('Day') },
          { value: 'week', label: label('Week') },
          { value: 'month', label: label('Month') },
        ],
      },
    },
    startDate: text('Force chart start (YYYY-MM-DD, optional)', ''),
    endDate: text('Force chart end (YYYY-MM-DD, optional)', ''),
    groupByClient: toggle('Group tasks under their client', false),
    showClientFilter: toggle('Show client filter dropdown', false),
    filterClientId: text('Filter by client id (bind to your own dropdown, optional)', ''),
    allClientsLabel: text('Filter: "all clients" label', 'All clients'),
    noClientLabel: text('Label for tasks without a client', 'No client'),
    includeToday: toggle('Always include today in range', true),
    defaultExpanded: toggle('Expand tasks by default', true),
    saveToSupabase: toggle('Save progress to Supabase automatically (no workflow needed)', true),
    tasksTable: text('Supabase table: tasks', 'tasks'),
    updatedTimeColumn: text('Column set to now on save (empty to skip)', 'updated_time'),
    allowDateEdit: toggle('Allow dragging bars to change start / end dates', true),
    allowProgressEdit: toggle('Allow dragging progress on bars', true),
    progressStep: num('Progress step when dragging (%)', 5, { min: 1, max: 100 }, 'settings'),
    showToday: toggle('Show today line', true),
    showWeekends: toggle('Shade weekends', true),
    showPriority: toggle('Show priority dot', true),
    showProgressLabel: toggle('Show % on task bars', true),
    headerLabel: text('Left column title', 'Task'),
    emptyText: text('Empty text', 'No tasks to display'),
    locale: text('Date locale', 'en-NZ'),

    // ---------- Layout ----------
    leftColumnWidth: num('Left column width (px)', 240),
    rowHeight: num('Row height (px)', 40),
    headerHeight: num('Header row height (px)', 28),
    barRatio: num('Task bar height (0-1)', 0.55, { max: 1, step: 0.05 }),
    clientBarRatio: num('Client bar height (0-1)', 0.3, { max: 1, step: 0.05 }),
    barRadius: num('Bar corner radius (px)', 4),
    trackOpacity: num('Bar background strength (%)', 20, { max: 100 }),
    dayWidthDay: num('Pixels per day (Day zoom)', 32),
    dayWidthWeek: num('Pixels per day (Week zoom)', 14),
    dayWidthMonth: num('Pixels per day (Month zoom)', 5),
    maxHeight: text('Max height (e.g. 600px, optional)', '', 'style'),
    borderRadius: num('Container corner radius (px)', 12),

    // ---------- Typography ----------
    fontFamily: text('Font family', 'inherit', 'style'),
    fontSize: num('Font size (px)', 13),

    // ---------- Colours ----------
    backgroundColor: color('Background', '#ffffff'),
    headerBackground: color('Header background', '#f6f7f9'),
    textColor: color('Text', '#1f2430'),
    secondaryTextColor: color('Secondary text', '#6b7280'),
    taskTextColor: color('Text: task names (empty = Text)', ''),
    clientTextColor: color('Text: client names (empty = Text)', ''),
    headerTextColor: color('Text: header and dates (empty = Secondary text)', ''),
    barTextColor: color('Text: % inside progress bars (empty = Text)', ''),
    borderColor: color('Border', '#e3e6ea'),
    gridLineColor: color('Grid lines', '#eef0f3'),
    weekendColor: color('Weekend shading', '#f7f8fa'),
    todayLineColor: color('Today line', '#d64545'),
    clientRowBackground: color('Client row background', '#f1f2f7'),
    colorClient: color('Client bar', '#5b4fd6'),
    colorInProgress: color('Bar: in progress', '#2f6fed'),
    colorDone: color('Bar: done', '#2e9e5b'),
    colorOverdue: color('Bar: overdue', '#d64545'),
    colorTodo: color('Bar: to do', '#8a8f98'),
    colorPriorityHigh: color('Priority 1 (high)', '#d64545'),
    colorPriorityMedium: color('Priority 2 (medium)', '#e0a526'),
    colorPriorityLow: color('Priority 3 (low)', '#8a8f98'),
  },
};
