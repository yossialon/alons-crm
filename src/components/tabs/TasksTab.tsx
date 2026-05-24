'use client';
import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/types';
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/api';
import { Plus, CheckCircle2, Circle, Clock, Trash2, AlertCircle } from 'lucide-react';

/* ── Config ────────────────────────────────────────────────────────────────── */

const PRIORITY_STYLES: Record<string, string> = {
  high:   'text-coral     bg-coral/10     border-coral/30',
  medium: 'text-amber-600 bg-amber-50     border-amber-200  dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400',
  low:    'text-zinc-500  bg-zinc-100     border-zinc-200   dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400',
};

const STATUS_NEXT: Record<string, Task['status']> = {
  open:        'in_progress',
  in_progress: 'done',
  done:        'open',
};

/* ── Group helpers ─────────────────────────────────────────────────────────── */

function groupTasks(tasks: Task[], today: string) {
  const todayTs  = new Date(today).getTime();
  const tomorrow = new Date(todayTs + 86_400_000).toISOString().split('T')[0];

  const overdue:   Task[] = [];
  const todayList: Task[] = [];
  const tomorrowList: Task[] = [];
  const later:     Task[] = [];

  tasks.filter((t) => t.status !== 'done').forEach((t) => {
    if (!t.due_date)                { later.push(t);        return; }
    if (t.due_date < today)         { overdue.push(t);      return; }
    if (t.due_date === today)       { todayList.push(t);    return; }
    if (t.due_date === tomorrow)    { tomorrowList.push(t); return; }
    later.push(t);
  });

  return { overdue, today: todayList, tomorrow: tomorrowList, later };
}

/* ── TaskRow ───────────────────────────────────────────────────────────────── */

function TaskRow({ task, today, onToggle, onDelete }: {
  task:     Task;
  today:    string;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const overdue  = task.due_date && task.due_date < today && task.status !== 'done';
  const dueToday = task.due_date === today;

  return (
    <div className="flex items-center gap-3 px-4 py-3 group hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
      <button
        onClick={() => onToggle(task)}
        className="shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-brand-500 transition-colors"
        title={`Mark as ${STATUS_NEXT[task.status]}`}
      >
        {task.status === 'done'
          ? <CheckCircle2 size={20} className="text-brand-400" />
          : task.status === 'in_progress'
            ? <Circle size={20} className="text-amber-400 fill-amber-100 dark:fill-amber-900/40" />
            : <Circle size={20} />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          task.status === 'done'
            ? 'line-through text-zinc-400 dark:text-zinc-600'
            : 'text-zinc-800 dark:text-zinc-100'
        }`}>
          {task.title}
        </p>
        {task.due_date && (
          <p className={`text-xs mt-0.5 flex items-center gap-1 ${
            overdue  ? 'text-coral' :
            dueToday ? 'text-amber-600 dark:text-amber-400' :
                       'text-zinc-400'
          }`}>
            {overdue ? <AlertCircle size={10} /> : <Clock size={10} />}
            {overdue ? 'Overdue · ' : dueToday ? 'Due today · ' : ''}
            {new Date(task.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>

      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
        {task.priority}
      </span>

      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ── Group section ─────────────────────────────────────────────────────────── */

function TaskGroup({ label, tasks, today, onToggle, onDelete, accent }: {
  label:    string;
  tasks:    Task[];
  today:    string;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  accent?:  string;
}) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        {accent && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accent}`} />}
        <p className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
          {label} <span className="opacity-60">({tasks.length})</span>
        </p>
      </div>
      <div className="card divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} today={today} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export default function TasksTab() {
  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [newTitle,    setNewTitle]    = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium');
  const [newDue,      setNewDue]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setTasks((await getTasks()) as Task[]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim(), priority: newPriority, due_date: newDue || null, status: 'open' });
    setNewTitle(''); setNewDue(''); setShowForm(false);
    await load();
  };

  const toggleStatus = async (task: Task) => {
    await updateTask(task.id, { title: task.title, status: STATUS_NEXT[task.status] });
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id); await load();
  };

  const today  = new Date().toISOString().split('T')[0];
  const done   = tasks.filter((t) => t.status === 'done');
  const groups = groupTasks(tasks, today);
  const openCount = tasks.filter((t) => t.status !== 'done').length;

  return (
    <div className="p-4 sm:p-6 animate-fade-in max-w-2xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Tasks</h2>
          <p className="text-xs text-muted mt-0.5">{openCount} open · {done.length} completed</p>
        </div>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* Quick-add form */}
      {showForm && (
        <div className="card p-4 space-y-3 animate-fade-in">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Task title…"
            className="input"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Task['priority'])}
              className="input w-auto"
            >
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <input
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="input w-auto"
            />
            <button onClick={handleCreate} className="btn-primary ml-auto">
              Save
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="p-8 text-center text-sm text-muted">Loading…</div>
      )}

      {/* Grouped open tasks */}
      {!loading && (
        <>
          <TaskGroup label="Overdue"   tasks={groups.overdue}   today={today} onToggle={toggleStatus} onDelete={handleDelete} accent="bg-coral" />
          <TaskGroup label="Today"     tasks={groups.today}     today={today} onToggle={toggleStatus} onDelete={handleDelete} accent="bg-amber-400" />
          <TaskGroup label="Tomorrow"  tasks={groups.tomorrow}  today={today} onToggle={toggleStatus} onDelete={handleDelete} accent="bg-info-400" />
          <TaskGroup label="Upcoming"  tasks={groups.later}     today={today} onToggle={toggleStatus} onDelete={handleDelete} accent="bg-zinc-300 dark:bg-zinc-600" />
        </>
      )}

      {/* Empty state */}
      {!loading && openCount === 0 && (
        <div className="card p-10 text-center">
          <CheckCircle2 size={32} className="text-brand-300 dark:text-brand-700 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">All caught up!</p>
          <p className="text-xs text-muted mt-0.5">No open tasks.</p>
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <details className="group">
          <summary className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-300 px-1 py-2 list-none flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0" />
            Completed ({done.length})
          </summary>
          <div className="mt-2 card divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden opacity-60">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} today={today} onToggle={toggleStatus} onDelete={handleDelete} />
            ))}
          </div>
        </details>
      )}

    </div>
  );
}
