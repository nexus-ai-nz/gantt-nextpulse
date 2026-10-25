<template>
  <div class="gnx">
    <div class="gnx-stats">
      <div v-for="s in stats" :key="s.label" class="gnx-stat"><b>{{ s.value }}</b><span>{{ s.label }}</span></div>
    </div>
    <div class="gnx-chart">
      <div class="gnx-grid">
        <div class="gnx-head gnx-lbl">Task</div>
        <div class="gnx-head gnx-months">
          <div v-for="m in months" :key="m.left" class="gnx-m" :style="{ left: m.left + '%' }">{{ m.label }}</div>
        </div>
        <template v-for="t in rows" :key="t.id">
          <div class="gnx-lbl"><div class="gnx-n" :title="t.name">{{ t.name }}</div><div class="gnx-a">{{ t.assignee }}</div></div>
          <div class="gnx-row">
            <div v-for="m in months" :key="'l' + m.left" class="gnx-vline" :style="{ left: m.left + '%' }"></div>
            <div v-if="todayPct !== null" class="gnx-today" :style="{ left: todayPct + '%' }"></div>
            <div
              class="gnx-task"
              :class="[t.unsched ? 'unsched' : 's-' + t.status.replace(/\s/g, '')]"
              :style="{ left: t.left + '%', width: t.width + '%' }"
              :title="`${t.name} · ${t.status} · ${t.progress}%`"
              @click="$emit('trigger-event', { name: 'task-click', event: { task: t.raw } })"
            >
              <div class="gnx-p" :style="{ width: t.progress + '%' }"></div><span>{{ t.progress }}%</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
const DAY = 864e5;
export default {
  props: { content: { type: Object, required: true }, uid: { type: String }, wwEditorState: { type: Object } },
  emits: ['trigger-event'],
  computed: {
    items() {
      const c = this.content || {};
      const span = Number(c.defaultSpanDays) || 14;
      const list = Array.isArray(c.tasks) ? c.tasks : [];
      return list
        .map((raw, i) => {
          const start = Date.parse(raw[c.startField || 'created_at']);
          const endRaw = raw[c.endField || 'due_date'];
          const unsched = !endRaw;
          const end = unsched ? start + span * DAY : Date.parse(endRaw);
          return {
            raw, unsched, start, end,
            id: raw.id ?? i,
            name: raw[c.nameField || 'name'] ?? '(untitled)',
            status: raw[c.statusField || 'status'] || 'To Do',
            progress: Math.min(100, Math.max(0, Number(raw[c.progressField || 'progress']) || 0)),
            assignee: raw[c.assigneeField || 'assignee'] ?? '',
          };
        })
        .filter(t => !isNaN(t.start) && !isNaN(t.end))
        .sort((a, b) => a.start - b.start);
    },
    range() {
      const now = Date.now();
      if (!this.items.length) return { min: now - 7 * DAY, max: now + 30 * DAY };
      return {
        min: Math.min(...this.items.map(t => t.start), now) - 7 * DAY,
        max: Math.max(...this.items.map(t => t.end), now) + 14 * DAY,
      };
    },
    rows() {
      const { min, max } = this.range;
      const span = max - min;
      return this.items.map(t => ({ ...t, left: ((t.start - min) / span) * 100, width: Math.max(((t.end - t.start) / span) * 100, 1.2) }));
    },
    months() {
      const { min, max } = this.range;
      const span = max - min;
      const out = [];
      const f = new Date(min);
      out.push({ left: 0, label: this.monthLabel(min) });
      let cur = Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 1);
      while (cur < max) {
        out.push({ left: ((cur - min) / span) * 100, label: this.monthLabel(cur) });
        const n = new Date(cur);
        cur = Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1);
      }
      return out;
    },
    todayPct() {
      const { min, max } = this.range;
      const now = Date.now();
      return now >= min && now <= max ? ((now - min) / (max - min)) * 100 : null;
    },
    stats() {
      const n = s => this.items.filter(t => t.status === s).length;
      return [
        { label: 'Tasks', value: this.items.length },
        { label: 'Done', value: n('Done') },
        { label: 'In progress', value: n('In Progress') },
        { label: 'No due date', value: this.items.filter(t => t.unsched).length },
      ];
    },
  },
  methods: {
    monthLabel(t) {
      return new Date(t).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    },
  },
};
</script>

<style scoped lang="scss">
.gnx { --bg: #101823; --surface: #182433; --border: #2c3541; --muted: #8fa0b5; --primary: #00a4ff; --accent: #ff43bd; --done: #2ecc8f; --todo: #6b7a90;
  color: #fff; font: 14px/1.4 system-ui, sans-serif; width: 100%; }
.gnx-stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.gnx-stat { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 8px 14px; b { display: block; font-size: 18px; } span { color: var(--muted); font-size: 12px; } }
.gnx-chart { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow-x: auto; }
.gnx-grid { display: grid; grid-template-columns: 240px 1fr; min-width: 800px; }
.gnx-head { border-bottom: 1px solid var(--border); height: 34px; color: var(--muted); font-weight: 600; }
.gnx-months { position: relative; }
.gnx-m { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--border); padding: 8px 6px; font-size: 12px; white-space: nowrap; }
.gnx-lbl { padding: 8px 14px; border-bottom: 1px solid var(--border); height: 52px; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
.gnx-head.gnx-lbl { height: 34px; }
.gnx-n { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.gnx-a { color: var(--muted); font-size: 12px; }
.gnx-row { position: relative; height: 52px; border-bottom: 1px solid var(--border); }
.gnx-vline { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--border); opacity: 0.5; }
.gnx-today { position: absolute; top: 0; bottom: 0; border-left: 2px solid var(--accent); z-index: 1; }
.gnx-task { position: absolute; top: 12px; height: 28px; border-radius: 7px; background: var(--todo); display: flex; align-items: center; padding: 0 8px; font-size: 12px; font-weight: 600; overflow: hidden; cursor: pointer;
  span { position: relative; } }
.gnx-p { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(255, 255, 255, 0.28); }
.s-Done { background: var(--done); }
.s-InProgress { background: var(--primary); }
.unsched { background: repeating-linear-gradient(45deg, #6b7a90, #6b7a90 6px, #55647a 6px, #55647a 12px); border: 1px dashed var(--muted); }
</style>
