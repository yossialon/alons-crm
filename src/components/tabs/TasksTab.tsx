'use client';
import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/types';
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/api';
import { Plus, CheckCircle2, Circle, Clock, Trash2, AlertCircle } from 'lucide-react';

const PRIORITY_STYLES: Record<string, string> = {
  high:   'text-red-600 bg-red-50 border-red-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  low:    'text-slate-500 bg-slate-50 border-slate-200',
};

const STATUS_NEXT: Record<string, Task['status']> = {
  open:        'in_progress',
  in_progress: 'done',
  done:        'open',
};

export default function TasksTab() {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
    await createTask({
      title:    newTitle.trim(),
      priority: newPriority,
      due_date: newDue || null,
      status:   'open',
    });
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

  const open = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Tasks</h2>
          <p className="text-xs text-slate-400">{open.length} open · {done.length} completed</p>
        </div>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 shadow-sm transition-colors"
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* Quick-add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Task title…"
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Task['priority'])}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <input
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              onClick={handleCreate}
              className="ml-auto px-4 py-2 rounded-xl bg-brand-700 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Open tasks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {loading && (
          <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
        )}
        {!loading && open.length === 0 && (
          <div className="p-10 text-center">
            <CheckCircle2 size={32} className="text-emerald-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium">All caught up!</p>
            <p className="text-xs text-slate-400 mt-0.5">No open tasks.</p>
          </div>
        )}
        {open.map((task) => (
          <TaskRow key={task.id} task={task} today={today} onToggle={toggleStatus} onDelete={handleDelete} />
        ))}
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <details>
          <summary className="text-xs font-semibold text-slate-400 uppercase tracking-widest cursor-pointer select-none hover:text-slate-600 px-1 py-2">
            Completed ({done.length})
          </summary>
          <div className="mt-2 bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 opacity-60">
            {done.map((task) => (
              <TaskRow key={task.id} task={task} today={today} onToggle={toggleStatus} onDelete={handleDelete} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TaskRow({ task, today, onToggle, onDelete }: {
  task: Task;
  today: string;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const overdue  = task.due_date && task.due_date < today && task.status !== 'done';
  const dueToday = task.due_date === today;

  return (
    <div className="flex items-center gap-3 px-4 py-3 group hover:bg-slate-50 transition-colors">
      <button
        onClick={() => onToggle(task)}
        className="shrink-0 text-slate-300 hover:text-emerald-500 transition-colors"
        title={`Mark as ${STATUS_NEXT[task.status]}`}
      >
        {task.status === 'done'
          ? <CheckCircle2 size={20} className="text-emerald-400" />
          : task.status === 'in_progress'
            ? <Circle size={20} className="text-amber-400 fill-amber-100" />
            : <Circle size={20} />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {task.title}
        </p>
        {task.due_date && (
          <p className={`text-xs mt-0.5 flex items-center gap-1 ${overdue ? 'text-red-500' : dueToday ? 'text-amber-600' : 'text-slate-400'}`}>
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
        className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
