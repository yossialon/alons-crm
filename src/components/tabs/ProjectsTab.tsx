'use client';
import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/types';
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/api';
import { FolderOpen, Plus, DollarSign, Calendar, Trash2 } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  estimate:  'text-blue-700 bg-blue-50 border-blue-200',
  active:    'text-emerald-700 bg-emerald-50 border-emerald-200',
  completed: 'text-slate-600 bg-slate-100 border-slate-200',
  cancelled: 'text-red-600 bg-red-50 border-red-200',
};

type FormState = { name: string; status: string; budget: string; notes: string };
const EMPTY_FORM: FormState = { name: '', status: 'estimate', budget: '', notes: '' };

export default function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProjects((await getProjects()) as Project[]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await createProject({
      name:   form.name.trim(),
      status: form.status,
      budget: form.budget ? parseFloat(form.budget) : null,
      notes:  form.notes,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    await load();
  };

  const handleStatusChange = async (project: Project, status: string) => {
    await updateProject(project.id, { name: project.name, status });
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    await load();
  };

  const active    = projects.filter((p) => p.status === 'active');
  const estimates = projects.filter((p) => p.status === 'estimate');
  const completed = projects.filter((p) => p.status === 'completed');
  const pipeline  = active.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active',    value: active.length,    color: 'bg-emerald-500' },
          { label: 'Estimates', value: estimates.length, color: 'bg-blue-500' },
          { label: 'Completed', value: completed.length, color: 'bg-slate-400' },
          { label: 'Active $',  value: `$${pipeline.toLocaleString()}`, color: 'bg-amber-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 relative overflow-hidden">
            <div className={`absolute left-0 inset-y-0 w-1 rounded-l-2xl ${s.color}`} />
            <div className="pl-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className="text-2xl font-black text-slate-800 tabular-nums">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Projects</h2>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 shadow-sm transition-colors"
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Project name…"
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              <option value="estimate">Estimate</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            <input
              type="number"
              placeholder="Budget ($)"
              value={form.budget}
              onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 w-32"
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

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
          Loading…
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FolderOpen size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">No projects yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "New Project" to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {projects.map((project) => (
            <div key={project.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate">{project.name}</p>
                {project.client_name && (
                  <p className="text-xs text-slate-400 mt-0.5">{project.client_name}</p>
                )}
              </div>

              {project.budget && (
                <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                  <DollarSign size={11} />
                  {Number(project.budget).toLocaleString()}
                </div>
              )}

              {(project.start_date || project.end_date) && (
                <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 shrink-0">
                  <Calendar size={11} />
                  {project.start_date?.slice(0, 7) ?? '?'} – {project.end_date?.slice(0, 7) ?? '?'}
                </div>
              )}

              <select
                value={project.status}
                onChange={(e) => handleStatusChange(project, e.target.value)}
                className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 cursor-pointer focus:outline-none shrink-0 ${STATUS_STYLES[project.status]}`}
              >
                <option value="estimate">Estimate</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                onClick={() => handleDelete(project.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
