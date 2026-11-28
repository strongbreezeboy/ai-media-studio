
import type { MediaTask } from '@xinmark/media-core';

interface MediaTaskListProps {
  tasks: MediaTask[];
  onCancelTask: (taskId: string) => void;
}

const taskStatusLabels: Record<MediaTask['status'], string> = {
  pending: '等待中',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export function MediaTaskList({
  tasks,
  onCancelTask,
}: MediaTaskListProps) {
  if (tasks.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-8">
      <h2 className="text-xl font-semibold">
        处理任务
      </h2>

      <div className="mt-6 space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-xl bg-slate-800 p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {task.type === 'video-trim'
                    ? '视频裁剪任务'
                    : '媒体处理任务'}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  任务 ID：{task.id}
                </p>
              </div>

              <span className="rounded-md bg-slate-700 px-3 py-1 text-xs">
                {taskStatusLabels[task.status]}
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${Math.round(task.progress)}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                进度
              </span>

              <span className="text-xs text-slate-300">
                {Math.round(task.progress)}%
              </span>
            </div>

            {task.error && (
              <p className="mt-3 text-sm text-red-400">
                {task.error}
              </p>
            )}

            {(task.status === 'pending' ||
              task.status === 'processing') && (
              <button
                type="button"
                onClick={() => onCancelTask(task.id)}
                className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
              >
                取消任务
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
