import React, { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { WorkspaceModuleShell } from '../../components/app-shell/WorkspaceModuleShell';
import { Button } from '../../components/ui/Button';
import {
  CampaignDbRow,
  createTaskApi,
  deleteTaskApi,
  fetchCampaignsApi,
  fetchInfluencersApi,
  fetchTasksApi,
  updateTaskApi,
  WorkspaceCreatorApiItem,
} from '../../services/api/workspaceApi';
import { WorkspaceTaskRow } from '../../types/database';

const SUGGESTED_TITLES = [
  'Review creator profile',
  'Find missing contact email',
  'Review generated email',
  'Approve outreach',
  'Follow up after initial email',
  'Check manually sent Instagram DM',
  'Update creator response',
];

export const TasksPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignDbRow[]>([]);
  const [creators, setCreators] = useState<WorkspaceCreatorApiItem[]>([]);
  const [tasks, setTasks] = useState<WorkspaceTaskRow[]>([]);
  const [filterCampaignId, setFilterCampaignId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState('Follow up after initial email');
  const [campaignId, setCampaignId] = useState('');
  const [influencerId, setInfluencerId] = useState('');
  const [priority, setPriority] = useState<WorkspaceTaskRow['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [camps, infRes, taskRes] = await Promise.all([
        fetchCampaignsApi(true),
        fetchInfluencersApi({ limit: 150 }),
        fetchTasksApi({
          campaignId: filterCampaignId || undefined,
          status: filterStatus,
        }),
      ]);
      setCampaigns(camps);
      setCreators(infRes.items);
      setTasks(taskRes.items);
      if (camps[0] && !campaignId) setCampaignId(camps[0].id);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to load workspace tasks.');
    } finally {
      setLoading(false);
    }
  }, [campaignId, filterCampaignId, filterStatus]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createTaskApi({
        campaignId: campaignId || null,
        influencerId: influencerId || null,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate || null,
        status: 'todo',
      });
      setDescription('');
      setNotice('Follow-up task saved.');
      await loadAll();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    task: WorkspaceTaskRow,
    nextStatus: WorkspaceTaskRow['status']
  ) => {
    try {
      const updated = await updateTaskApi(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to update task status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTaskApi(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to delete task.');
    }
  };

  const creatorNameById = new Map(creators.map((c) => [c.influencer.id, c.influencer.name]));
  const campaignNameById = new Map(campaigns.map((c) => [c.id, c.name]));

  return (
    <WorkspaceModuleShell
      moduleName="Tasks"
      currentPath="/dashboard/tasks"
      subtitle="Manage creator review tasks, missing-email research, and post-outreach follow-ups"
      headerActions={
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter tasks by campaign"
            value={filterCampaignId}
            onChange={(e) => setFilterCampaignId(e.target.value)}
            className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter tasks by status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      }
    >
      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#DDD6FE] bg-[#EDE9FE]/70 px-4 py-2.5 text-xs font-medium text-[#5B21B6]">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-3 h-fit"
        >
          <h2 className="text-sm font-bold text-[#111827] flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-[#5B21B6]" />
            <span>Create Follow-up Task</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">Task Title</label>
            <input
              type="text"
              required
              minLength={3}
              list="suggested-task-titles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5 text-xs"
            />
            <datalist id="suggested-task-titles">
              {SUGGESTED_TITLES.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">Campaign</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
            >
              <option value="">General Workspace</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Creator (Optional)
            </label>
            <select
              value={influencerId}
              onChange={(e) => setInfluencerId(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
            >
              <option value="">None</option>
              {creators.map((c) => (
                <option key={c.influencer.id} value={c.influencer.id}>
                  {c.influencer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkspaceTaskRow['priority'])}
                className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Context or follow-up checklist"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[#D1D5DB] p-2 text-xs"
            />
          </div>

          <Button type="submit" variant="primary" size="sm" disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Add Task'}
          </Button>
        </form>

        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
              <CheckSquare className="mx-auto h-6 w-6 text-[#9CA3AF] mb-2" />
              No follow-up tasks match the selected filters.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-[#E5E7EB] bg-white p-4 flex flex-wrap items-start justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`text-sm font-bold ${
                        task.status === 'completed'
                          ? 'line-through text-[#6B7280]'
                          : 'text-[#111827]'
                      }`}
                    >
                      {task.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        task.priority === 'high'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : task.priority === 'medium'
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : 'bg-[#F3F4F6] text-[#4B5563]'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">
                    {task.campaign_id ? campaignNameById.get(task.campaign_id) || 'Campaign' : 'Workspace'}{' '}
                    {task.influencer_id
                      ? `· Creator: ${creatorNameById.get(task.influencer_id) || 'Linked'}`
                      : ''}
                    {task.due_date ? ` · Due: ${task.due_date.slice(0, 10)}` : ''}
                  </p>
                  {task.description && (
                    <p className="text-xs text-[#374151] pt-0.5">{task.description}</p>
                  )}
                  {task.completed_at && (
                    <p className="text-[11px] text-[#059669] font-medium">
                      Completed at {new Date(task.completed_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Status for ${task.title}`}
                    value={task.status}
                    onChange={(e) =>
                      void handleStatusChange(task, e.target.value as WorkspaceTaskRow['status'])
                    }
                    className="h-8 rounded-lg border border-[#D1D5DB] bg-white px-2 text-xs font-medium"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleDelete(task.id)}
                    aria-label={`Delete ${task.title}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </WorkspaceModuleShell>
  );
};
