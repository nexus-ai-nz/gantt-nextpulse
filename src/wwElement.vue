<template>
  <div class="gx" :style="rootStyle">
    <div v-if="saveError" class="gx-toast">{{ saveError }}</div>
    <div v-if="errMsg" class="gx-empty gx-error">Gantt error — {{ errMsg }}</div>
    <div v-else-if="!rows.length" class="gx-empty">{{ emptyText }}</div>
    <div v-else class="gx-scroll" :style="{ maxHeight: maxHeight || 'none' }">
      <div class="gx-inner" :style="{ width: leftW + totalPx + 'px' }">
        <div class="gx-head">
          <div class="gx-left gx-hleft">
            <select
              v-if="showClientFilter && !externalFilter && clientOptions.length"
              v-model="selectedClient"
              class="gx-select"
              @change="onClientChange"
            >
              <option value="">{{ allClientsLabel }}</option>
              <option v-for="o in clientOptions" :key="o.id" :value="o.id">{{ o.name }}</option>
            </select>
            <span v-else>{{ headerLabel }}</span>
          </div>
          <div class="gx-hright" :style="{ width: totalPx + 'px' }">
            <div class="gx-months">
              <div
                v-for="m in months"
                :key="m.key"
                class="gx-month"
                :style="{ left: m.left + 'px', width: m.width + 'px' }"
              >{{ m.label }}</div>
            </div>
            <div class="gx-ticks">
              <div
                v-for="t in ticks"
                :key="t.key"
                class="gx-tick"
                :style="{ left: t.left + 'px', width: t.width + 'px' }"
              >{{ t.label }}</div>
            </div>
          </div>
        </div>

        <div class="gx-body">
          <div class="gx-layer" :style="{ left: leftW + 'px', width: totalPx + 'px' }">
            <div
              v-for="w in weekends"
              :key="'w' + w"
              class="gx-weekend"
              :style="{ left: w + 'px', width: pxPerDay + 'px' }"
            />
            <div
              v-for="t in ticks"
              :key="'v' + t.key"
              class="gx-vline"
              :style="{ left: t.left + 'px' }"
            />
            <div v-if="showToday && todayLeft !== null" class="gx-today" :style="{ left: todayLeft + 'px' }" />
          </div>

          <div
            v-for="r in rows"
            :key="r.key"
            class="gx-row"
            :class="{ 'gx-sub': r.isSub, 'gx-clientrow': r.isClient }"
            :style="{ height: rowH + 'px' }"
          >
            <div class="gx-left gx-cell" :style="{ paddingLeft: 8 + r.depth * 18 + (r.isSub ? 18 : 0) + 'px' }">
              <span
                v-if="!r.isSub"
                class="gx-toggle"
                :class="{ 'gx-toggle-off': !r.hasChildren }"
                @click="toggle(r.openKey)"
              >
                <svg v-if="r.hasChildren" width="12" height="12" viewBox="0 0 12 12" :style="{ transform: r.open ? 'rotate(90deg)' : 'none' }">
                  <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span v-if="!r.isSub && !r.isClient && showPriority" class="gx-prio" :style="{ background: r.prioColor }" />
              <span class="gx-name" :class="{ 'gx-name-main': !r.isSub, 'gx-name-client': r.isClient }" :title="r.name">{{ r.name }}</span>
              <span v-if="r.isClient" class="gx-count">{{ r.count }}</span>
            </div>

            <div class="gx-track" :style="{ width: totalPx + 'px' }">
              <div
                v-if="r.bar"
                class="gx-bar"
                :style="barStyle(r)"
                :title="r.tooltip"
                :class="{ 'gx-editable': r.canEdit, 'gx-dragging': drag && drag.key === r.key }"
                @click="onBarClick(r)"
              >
                <div class="gx-fill" :style="{ width: r.progress + '%', background: r.color }" />
                <span v-if="showProgressLabel && !r.isSub && r.bar.width > 44" class="gx-pct">{{ r.progress }}%</span>
                <div
                  v-if="r.canEdit"
                  class="gx-handle"
                  :style="{ left: 'clamp(0px, calc(' + r.progress + '% - 6px), calc(100% - 12px))' }"
                  @pointerdown.stop.prevent="startDrag($event, r)"
                  @click.stop
                />
              </div>
              <div
                v-if="drag && drag.key === r.key"
                class="gx-tip"
                :style="{ left: r.bar.left + (r.bar.width * r.progress) / 100 + 'px' }"
              >{{ r.progress }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue';

const DAY = 86400000;
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const toDate = v => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : startOfDay(d);
};
const getPath = (o, path) => String(path).split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const list = v => String(v || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

export default {
  props: {
    uid: { type: String, required: true },
    content: { type: Object, required: true },
    wwEditorState: { type: Object, default: () => ({}) },
  },
  emits: ['trigger-event'],
  setup(props, { emit }) {
    const c = (key, fallback) => {
      const v = props.content ? props.content[key] : undefined;
      return v === undefined || v === null || v === '' ? fallback : v;
    };
    const n = (key, fallback) => {
      const v = Number(c(key, fallback));
      return isNaN(v) ? fallback : v;
    };

    const errMsg = ref('');
    const guard = (name, fn, fallback) => () => {
      try {
        return fn();
      } catch (e) {
        const msg = name + ': ' + ((e && e.message) || e);
        Promise.resolve().then(() => { errMsg.value = msg; });
        return typeof fallback === 'function' ? fallback() : fallback;
      }
    };

    let setSelected = () => {};
    try {
      if (typeof wwLib !== 'undefined') {
        const v = wwLib.wwVariable.useComponentVariable({
          uid: props.uid,
          name: 'selectedItem',
          type: 'object',
          defaultValue: null,
        });
        setSelected = v.setValue;
      }
    } catch (e) { /* preview outside WeWeb */ }

    const overrides = ref({});
    const drag = ref(null);
    watch(
      [() => props.content && props.content.tasks, () => props.content && props.content.subtasks],
      () => { overrides.value = {}; },
    );
    const pOf = (it, pre) => {
      const v = overrides.value[pre + it.id];
      return v === undefined ? it.progress : v;
    };

    const openMap = ref({});
    const isOpen = id => (openMap.value[id] !== undefined ? openMap.value[id] : !!c('defaultExpanded', true));
    const toggle = id => { openMap.value = { ...openMap.value, [id]: !isOpen(id) }; };

    const leftW = computed(() => n('leftColumnWidth', 240));
    const rowH = computed(() => n('rowHeight', 40));
    const pxPerDay = computed(() => {
      const m = c('viewMode', 'day');
      if (m === 'week') return n('dayWidthWeek', 14);
      if (m === 'month') return n('dayWidthMonth', 5);
      return n('dayWidthDay', 32);
    });
    const locale = computed(() => c('locale', 'en-NZ'));
    const selectedClient = ref('');
    const externalFilter = computed(() => String(c('filterClientId', '')) !== '');
    const activeClient = computed(() => (externalFilter.value ? String(c('filterClientId', '')) : String(selectedClient.value || '')));

    const colorMap = computed(() => ({
      progress: c('colorInProgress', '#2f6fed'),
      done: c('colorDone', '#2e9e5b'),
      overdue: c('colorOverdue', '#d64545'),
      todo: c('colorTodo', '#8a8f98'),
    }));
    const prioColors = computed(() => ({
      1: c('colorPriorityHigh', '#d64545'),
      2: c('colorPriorityMedium', '#e0a526'),
      3: c('colorPriorityLow', '#8a8f98'),
    }));

    const today = computed(() => startOfDay(new Date()));

    const findClientName = raw => {
      const f = c('clientNameField', '');
      if (f) return getPath(raw, f);
      const x = raw.clients !== undefined ? raw.clients : raw.client;
      if (typeof x === 'string') return x;
      const o = Array.isArray(x) ? x[0] : x;
      if (o && typeof o === 'object') return o.name || o.company_name || o.client_name;
      return raw.client_name || raw.clientName;
    };

    const normalize = (raw, isSub, parentId) => {
      const idF = c('idField', 'id');
      const created = toDate(raw[c('createdField', 'created_at')]);
      let s = toDate(raw[c('startField', 'start_date')]);
      let e = toDate(raw[c('endField', 'due_date')]);
      if (!s && e) s = created && created <= e ? created : new Date(e.getTime() - DAY);
      if (s && !e) e = new Date(s.getTime() + DAY);
      if (s && e && e < s) e = s;
      let progress = Number(raw[c('progressField', 'progress')]);
      progress = isNaN(progress) ? 0 : Math.max(0, Math.min(100, Math.round(progress)));
      const status = String(raw[c('statusField', 'status')] || '').toLowerCase();
      return {
        raw,
        id: raw[idF],
        parentId,
        isSub,
        name: raw[c('nameField', 'name')] || '(untitled)',
        status,
        priority: Number(raw[c('priorityField', 'priority')]) || 3,
        start: s,
        end: e,
        progress,
        sort: Number(raw[c('sortField', 'sort_order')]) || 0,
        clientId: raw[c('clientField', 'client_id')],
        clientName: findClientName(raw),
      };
    };

    const tasks = computed(() => {
      const a = c('tasks', []);
      return (Array.isArray(a) ? a : []).filter(x => x && typeof x === 'object').map(t => normalize(t, false, null));
    });
    const subsByTask = computed(() => {
      const a = c('subtasks', []);
      const map = {};
      (Array.isArray(a) ? a : []).filter(x => x && typeof x === 'object').forEach(s => {
        const pid = s[c('parentField', 'task_id')];
        (map[pid] = map[pid] || []).push(normalize(s, true, pid));
      });
      Object.values(map).forEach(arr => arr.sort((x, y) => x.sort - y.sort || (x.start || 0) - (y.start || 0)));
      return map;
    });

    const clientsMap = computed(() => {
      const a = c('clients', []);
      const m = {};
      (Array.isArray(a) ? a : []).forEach(r => {
        if (r) m[String(r[c('clientsIdField', 'id')])] = r[c('clientsNameField', 'name')];
      });
      return m;
    });
    const clientLabel = (id, fallbackName) => {
      const k = id === null || id === undefined ? '' : String(id);
      if (k === '') return c('noClientLabel', 'No client');
      return clientsMap.value[k] || fallbackName || 'Client ' + k;
    };
    const visibleTasks = computed(() => {
      if (activeClient.value === '') return tasks.value;
      return tasks.value.filter(t => String(t.clientId === null || t.clientId === undefined ? '' : t.clientId) === activeClient.value);
    });
    const clientOptions = computed(() => {
      const seen = {};
      tasks.value.forEach(t => {
        if (t.clientId === null || t.clientId === undefined || t.clientId === '') return;
        const k = String(t.clientId);
        if (!seen[k]) seen[k] = { id: k, name: clientLabel(k, t.clientName) };
      });
      return Object.values(seen).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    });
    const onClientChange = () => {
      emit('trigger-event', { name: 'client-filter-change', event: { value: selectedClient.value } });
    };

    const kindOf = it => {
      const done = list(c('doneStatuses', 'done,completed,complete'));
      const todo = list(c('todoStatuses', 'todo,to do,not started,open,backlog'));
      if (done.includes(it.status) || it.progress >= 100) return 'done';
      if (it.end && it.end < today.value) return 'overdue';
      if (todo.includes(it.status) && it.progress === 0) return 'todo';
      return 'progress';
    };

    const origin = computed(guard('origin', () => {
      const dates = [];
      const push = it => { if (it.start) dates.push(it.start, it.end); };
      visibleTasks.value.forEach(t => { push(t); (subsByTask.value[t.id] || []).forEach(push); });
      const ov = toDate(c('startDate', ''));
      const ovE = toDate(c('endDate', ''));
      let min = dates.length ? new Date(Math.min(...dates)) : new Date(today.value);
      let max = dates.length ? new Date(Math.max(...dates)) : new Date(today.value.getTime() + 30 * DAY);
      if (c('includeToday', true)) {
        if (today.value < min) min = today.value;
        if (today.value > max) max = today.value;
      }
      const lo = ov || new Date(min.getTime() - 3 * DAY);
      const hi = ovE || new Date(max.getTime() + 7 * DAY);
      return { lo, days: Math.max(14, Math.round((hi - lo) / DAY) + 1) };
    }, () => ({ lo: startOfDay(new Date()), days: 30 })));

    const totalDays = computed(() => origin.value.days);
    const totalPx = computed(() => totalDays.value * pxPerDay.value);
    const dayIdx = d => Math.round((d - origin.value.lo) / DAY);
    const dateAt = i => new Date(origin.value.lo.getFullYear(), origin.value.lo.getMonth(), origin.value.lo.getDate() + i);
    const fmt = d => d.toLocaleDateString(locale.value, { day: 'numeric', month: 'short' });

    const rows = computed(guard('rows', () => {
      const out = [];
      const auto = !!c('autoParentProgress', false);
      const grouped = !!c('groupByClient', true);
      const buildTask = (t, depth) => {
        const subs = subsByTask.value[t.id] || [];
        const open = isOpen('t' + t.id);
        let progress = pOf(t, 't');
        if (auto && subs.length) {
          const w = subs.map(x => (x.start && x.end ? (x.end - x.start) / DAY + 1 : 1));
          const tot = w.reduce((p, q) => p + q, 0);
          progress = Math.round(subs.reduce((acc, x, i) => acc + pOf(x, 's') * w[i], 0) / tot);
        }
        out.push(decorate({ ...t, progress }, { hasChildren: subs.length > 0, open, depth, openKey: 't' + t.id, noEdit: auto && subs.length > 0 }));
        if (open) subs.forEach(x => out.push(decorate(x, { depth: depth + 1 })));
      };
      const sorted = [...visibleTasks.value].sort((x, y) => (x.start || 0) - (y.start || 0));
      if (!grouped) {
        sorted.forEach(t => buildTask(t, 0));
        return out;
      }
      const groups = new Map();
      sorted.forEach(t => {
        const k = t.clientId === null || t.clientId === undefined ? '' : String(t.clientId);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(t);
      });
      const gl = [...groups.entries()]
        .map(([k, ts]) => ({ k, ts, name: clientLabel(k, ts[0].clientName) }))
        .sort((x, y) => String(x.name).localeCompare(String(y.name)));
      gl.forEach(g => {
        const open = isOpen('c' + g.k);
        out.push(clientRow(g, open));
        if (open) g.ts.forEach(t => buildTask(t, 1));
      });
      return out;
    }, []));

    function clientRow(g, open) {
      const starts = g.ts.filter(t => t.start).map(t => t.start.getTime());
      const ends = g.ts.filter(t => t.end).map(t => t.end.getTime());
      const progress = g.ts.length ? Math.round(g.ts.reduce((a, t) => a + t.progress, 0) / g.ts.length) : 0;
      let bar = null;
      if (starts.length) {
        const s0 = new Date(Math.min(...starts));
        const e0 = new Date(Math.max(...ends));
        bar = {
          left: dayIdx(s0) * pxPerDay.value,
          width: Math.max(pxPerDay.value, (dayIdx(e0) - dayIdx(s0) + 1) * pxPerDay.value),
        };
      }
      return {
        key: 'c' + g.k,
        openKey: 'c' + g.k,
        isClient: true,
        isSub: false,
        id: g.k,
        name: g.name,
        hasChildren: true,
        open,
        depth: 0,
        count: g.ts.length,
        progress,
        bar,
        color: c('colorClient', '#5b4fd6'),
        raw: null,
        tooltip: g.name + ' • ' + g.ts.length + ' task' + (g.ts.length > 1 ? 's' : '') + ' • ' + progress + '%',
      };
    }

    function decorate(it0, extra) {
      const ov = overrides.value[(it0.isSub ? 's' : 't') + it0.id];
      const it = ov === undefined ? it0 : { ...it0, progress: ov };
      const kind = kindOf(it);
      const color = colorMap.value[kind];
      let bar = null;
      if (it.start && it.end) {
        const left = dayIdx(it.start) * pxPerDay.value;
        const width = Math.max(pxPerDay.value, (dayIdx(it.end) - dayIdx(it.start) + 1) * pxPerDay.value);
        bar = { left, width };
      }
      return {
        ...it,
        depth: 0,
        ...extra,
        key: (it.isSub ? 's' : 't') + it.id,
        canEdit: !!c('allowProgressEdit', true) && !extra.noEdit && !!bar,
        color,
        prioColor: prioColors.value[Math.min(3, Math.max(1, Math.round(it.priority)))] || prioColors.value[3],
        bar,
        tooltip: it.start ? `${it.name} • ${it.progress}% • ${fmt(it.start)} → ${fmt(it.end)}` : it.name,
      };
    }

    const barStyle = r => {
      const h = Math.round(rowH.value * (r.isClient ? n('clientBarRatio', 0.3) : r.isSub ? n('subBarRatio', 0.35) : n('barRatio', 0.55)));
      return {
        left: r.bar.left + 'px',
        width: r.bar.width + 'px',
        height: h + 'px',
        top: Math.round((rowH.value - h) / 2) + 'px',
        borderColor: r.color,
        background: `color-mix(in srgb, ${r.color} ${n('trackOpacity', 20)}%, transparent)`,
        borderRadius: n('barRadius', 4) + 'px',
      };
    };

    const ticks = computed(guard('ticks', () => {
      const mode = c('viewMode', 'day');
      const idx = [];
      for (let i = 0; i < totalDays.value; i++) {
        const d = dateAt(i);
        if (mode === 'day') idx.push(i);
        else if (mode === 'week' && d.getDay() === 1) idx.push(i);
        else if (mode === 'month' && d.getDate() === 1) idx.push(i);
      }
      return idx.map((i, k) => {
        const d = dateAt(i);
        const next = k + 1 < idx.length ? idx[k + 1] : totalDays.value;
        const label = mode === 'day'
          ? String(d.getDate())
          : mode === 'week'
            ? fmt(d)
            : d.toLocaleDateString(locale.value, { month: 'short' });
        return { key: i, left: i * pxPerDay.value, width: (next - i) * pxPerDay.value, label };
      });
    }, []));

    const months = computed(guard('months', () => {
      const out = [];
      let startI = 0;
      for (let i = 1; i <= totalDays.value; i++) {
        const a = dateAt(i - 1);
        const b = i < totalDays.value ? dateAt(i) : null;
        if (!b || b.getMonth() !== a.getMonth()) {
          const w = (i - startI) * pxPerDay.value;
          out.push({
            key: startI,
            left: startI * pxPerDay.value,
            width: w,
            label: w > 60 ? a.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' }) : '',
          });
          startI = i;
        }
      }
      return out;
    }, []));

    const weekends = computed(() => {
      if (!c('showWeekends', true) || pxPerDay.value < 10) return [];
      const out = [];
      for (let i = 0; i < totalDays.value; i++) {
        const g = dateAt(i).getDay();
        if (g === 0 || g === 6) out.push(i * pxPerDay.value);
      }
      return out;
    });

    const todayLeft = computed(() => {
      const i = dayIdx(today.value);
      return i < 0 || i >= totalDays.value ? null : i * pxPerDay.value + pxPerDay.value / 2;
    });

    const saveError = ref('');
    let toastTimer = null;
    const showError = msg => {
      saveError.value = msg;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { saveError.value = ''; }, 6000);
    };
    const getSupabase = () => {
      try {
        if (typeof wwLib === 'undefined') return null;
        const sb = wwLib.wwPlugins && wwLib.wwPlugins.supabase;
        return (sb && (sb.instance || sb.client)) || null;
      } catch (e) {
        return null;
      }
    };
    const saveProgress = async (r, value) => {
      if (!c('saveToSupabase', true)) return;
      const fail = msg => {
        const o = { ...overrides.value };
        delete o[r.key];
        overrides.value = o;
        showError('Progress not saved: ' + msg);
        emit('trigger-event', { name: 'progress-save-error', event: { value: { id: r.id, isSubtask: !!r.isSub, message: msg } } });
      };
      const client = getSupabase();
      if (!client) return fail('Supabase connection not found');
      try {
        const patch = { [c('progressField', 'progress')]: value };
        const upd = c('updatedTimeColumn', 'updated_time');
        if (upd) patch[upd] = new Date().toISOString();
        const table = r.isSub ? c('subtasksTable', 'subtasks') : c('tasksTable', 'tasks');
        const res = await client.from(table).update(patch).eq(c('idField', 'id'), r.id).select();
        if (res.error) return fail(res.error.message || 'update failed');
        if (!res.data || !res.data.length) return fail('no row updated (check the table name or the RLS update policy)');
        emit('trigger-event', { name: 'progress-saved', event: { value: { id: r.id, isSubtask: !!r.isSub, progress: value } } });
      } catch (e) {
        fail((e && e.message) || 'update failed');
      }
    };

    const startDrag = (e, r) => {
      if (!r.canEdit || !r.bar) return;
      setSelected(r.raw);
      const barEl = e.currentTarget.parentElement;
      const rect = barEl.getBoundingClientRect();
      const width = rect.width || r.bar.width;
      const step = Math.max(1, n('progressStep', 5));
      const start = r.progress;
      let last = start;
      drag.value = { key: r.key };
      const calc = ev => {
        const pct = ((ev.clientX - rect.left) / width) * 100;
        return Math.max(0, Math.min(100, Math.round(pct / step) * step));
      };
      const move = ev => {
        last = calc(ev);
        overrides.value = { ...overrides.value, [r.key]: last };
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        drag.value = null;
        if (last === start) return;
        const prev = Number(r.raw && r.raw[c('progressField', 'progress')]);
        saveProgress(r, last);
        emit('trigger-event', {
          name: r.isSub ? 'subtask-progress-change' : 'task-progress-change',
          event: {
            value: {
              id: r.id,
              parentId: r.parentId === undefined ? null : r.parentId,
              isSubtask: !!r.isSub,
              progress: last,
              previous: isNaN(prev) ? 0 : prev,
              row: r.raw,
            },
          },
        });
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    };

    const onBarClick = r => {
      if (r.isClient) return;
      setSelected(r.raw);
      emit('trigger-event', {
        name: r.isSub ? 'subtask-click' : 'task-click',
        event: { value: r.raw },
      });
    };

    const rootStyle = computed(() => ({
      '--gx-bg': c('backgroundColor', '#ffffff'),
      '--gx-head-bg': c('headerBackground', '#f6f7f9'),
      '--gx-text': c('textColor', '#1f2430'),
      '--gx-text2': c('secondaryTextColor', '#6b7280'),
      '--gx-title': c('taskTextColor', c('textColor', '#1f2430')),
      '--gx-client-text': c('clientTextColor', c('textColor', '#1f2430')),
      '--gx-sub-text': c('subtaskTextColor', c('secondaryTextColor', '#6b7280')),
      '--gx-head-text': c('headerTextColor', c('secondaryTextColor', '#6b7280')),
      '--gx-bar-text': c('barTextColor', c('textColor', '#1f2430')),
      '--gx-border': c('borderColor', '#e3e6ea'),
      '--gx-grid': c('gridLineColor', '#eef0f3'),
      '--gx-today': c('todayLineColor', '#d64545'),
      '--gx-weekend': c('weekendColor', '#f7f8fa'),
      '--gx-client-bg': c('clientRowBackground', '#f1f2f7'),
      '--gx-left': leftW.value + 'px',
      '--gx-radius': n('borderRadius', 12) + 'px',
      '--gx-head-h': n('headerHeight', 28) + 'px',
      fontFamily: c('fontFamily', 'inherit'),
      fontSize: n('fontSize', 13) + 'px',
    }));

    return {
      errMsg, rows, ticks, months, selectedClient, clientOptions, onClientChange, externalFilter, weekends, todayLeft, totalPx, pxPerDay, leftW, rowH, rootStyle,
      toggle, onBarClick, barStyle, startDrag, drag, saveError,
      showToday: computed(() => !!c('showToday', true)),
      showPriority: computed(() => !!c('showPriority', true)),
      showProgressLabel: computed(() => !!c('showProgressLabel', true)),
      showClientFilter: computed(() => !!c('showClientFilter', true)),
      allClientsLabel: computed(() => c('allClientsLabel', 'All clients')),
      headerLabel: computed(() => c('headerLabel', 'Task')),
      emptyText: computed(() => c('emptyText', 'No tasks to display')),
      maxHeight: computed(() => c('maxHeight', '')),
    };
  },
};
</script>

<style scoped>
.gx { position: relative; min-height: 60px; background: var(--gx-bg); color: var(--gx-text); border: 1px solid var(--gx-border); border-radius: var(--gx-radius); overflow: hidden; width: 100%; box-sizing: border-box; }
.gx-error { color: #d64545; white-space: pre-wrap; }
.gx-empty { padding: 32px; text-align: center; color: var(--gx-text2); }
.gx-scroll { overflow: auto; position: relative; }
.gx-inner { position: relative; min-width: 100%; }
.gx-head { display: flex; position: sticky; top: 0; z-index: 5; background: var(--gx-head-bg); border-bottom: 1px solid var(--gx-border); }
.gx-left { flex: none; width: var(--gx-left); box-sizing: border-box; position: sticky; left: 0; z-index: 4; background: var(--gx-bg); border-right: 1px solid var(--gx-border); }
.gx-hleft { background: var(--gx-head-bg); z-index: 6; padding: 0 12px; display: flex; align-items: center; color: var(--gx-head-text); }
.gx-hright { position: relative; flex: none; }
.gx-months, .gx-ticks { position: relative; height: var(--gx-head-h); }
.gx-month, .gx-tick { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; padding-left: 6px; box-sizing: border-box; overflow: hidden; white-space: nowrap; color: var(--gx-head-text); border-left: 1px solid var(--gx-border); font-size: 0.92em; }
.gx-tick { border-left-color: var(--gx-grid); border-top: 1px solid var(--gx-grid); }
.gx-body { position: relative; }
.gx-layer { position: absolute; top: 0; bottom: 0; z-index: 0; pointer-events: none; }
.gx-weekend { position: absolute; top: 0; bottom: 0; background: var(--gx-weekend); }
.gx-vline { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--gx-grid); }
.gx-today { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px dashed var(--gx-today); z-index: 2; }
.gx-row { position: relative; z-index: 1; display: flex; border-bottom: 1px solid var(--gx-grid); }
.gx-row:last-child { border-bottom: none; }
.gx-cell { display: flex; align-items: center; gap: 6px; padding-right: 8px; overflow: hidden; z-index: 3; }
.gx-toggle { flex: none; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; color: var(--gx-text2); cursor: pointer; }
.gx-toggle-off { cursor: default; }
.gx-toggle svg { transition: transform 0.15s; }
.gx-clientrow { background: color-mix(in srgb, var(--gx-client-bg) 55%, transparent); }
.gx-clientrow .gx-left { background: var(--gx-client-bg); }
.gx-name-client { color: var(--gx-client-text); font-weight: 600; }
.gx-count { flex: none; font-size: 0.85em; color: var(--gx-text2); background: var(--gx-bg); border: 1px solid var(--gx-border); border-radius: 999px; padding: 0 7px; line-height: 1.5; }
.gx-select { width: 100%; font: inherit; color: var(--gx-head-text); background: transparent; border: 1px solid var(--gx-border); border-radius: 6px; padding: 3px 6px; }
.gx-prio { flex: none; width: 8px; height: 8px; border-radius: 50%; }
.gx-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--gx-sub-text); }
.gx-name-main { color: var(--gx-title); font-weight: 500; }
.gx-track { position: relative; flex: none; }
.gx-bar { position: absolute; border: 1px solid; box-sizing: border-box; overflow: hidden; cursor: pointer; }
.gx-toast { position: absolute; left: 8px; bottom: 8px; right: 8px; z-index: 20; padding: 6px 10px; border-radius: 6px; font-size: 0.9em; color: #fff; background: #d64545; }
.gx-handle { position: absolute; top: 0; bottom: 0; width: 12px; cursor: ew-resize; touch-action: none; opacity: 0; z-index: 2; }
.gx-handle::after { content: ''; position: absolute; left: 4px; right: 4px; top: 15%; bottom: 15%; border-radius: 2px; background: var(--gx-text); opacity: 0.85; }
.gx-editable:hover .gx-handle, .gx-dragging .gx-handle { opacity: 1; }
.gx-dragging { cursor: ew-resize; user-select: none; }
.gx-tip { position: absolute; top: 1px; transform: translateX(-50%); z-index: 6; padding: 1px 6px; font-size: 0.8em; font-weight: 500; line-height: 1.4; color: var(--gx-bg); background: var(--gx-text); border-radius: 4px; pointer-events: none; white-space: nowrap; }
.gx-fill { position: absolute; left: 0; top: 0; bottom: 0; opacity: 0.85; }
.gx-pct { position: relative; padding-left: 6px; font-size: 0.85em; font-weight: 500; line-height: 1; display: flex; align-items: center; height: 100%; color: var(--gx-bar-text); }
</style>
