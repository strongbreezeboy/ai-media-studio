'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  deleteProject,
  getRecentProjects,
  type MediaProject,
} from '@/lib/project-storage';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function handleDownload(project: MediaProject) {
  if (!project.outputBlob) return;

  const url = URL.createObjectURL(project.outputBlob);
  const link = document.createElement('a');

  const extension = project.outputBlob.type.includes('webm')
    ? 'webm'
    : project.outputBlob.type.includes('quicktime')
      ? 'mov'
      : 'mp4';

  link.href = url;
  link.download = `${project.name}.${extension}`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RecentProjects() {
  const [projects, setProjects] = useState<MediaProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        const result = await getRecentProjects(20);

        if (active) {
          setProjects(result);
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : '读取项目失败',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(project: MediaProject) {
    const confirmed = window.confirm(
      `确定删除项目「${project.name}」吗？删除后无法恢复。`,
    );

    if (!confirmed) return;

    setDeletingId(project.id);
    setError('');

    try {
      await deleteProject(project.id);

      setProjects((current) =>
        current.filter((item) => item.id !== project.id),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '删除项目失败',
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800/90 bg-[#101827] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-blue-500" />

            <h2 className="text-lg font-semibold text-white">
              最近项目
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            管理和继续你的创作
          </p>
        </div>

        <span className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400">
          {projects.length} 个项目
        </span>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-5 flex min-h-44 items-center justify-center rounded-xl border border-slate-800 bg-[#0c1321]/60">
          <p className="text-sm text-slate-500">
            正在加载项目...
          </p>
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/80 bg-[#0c1321]/60 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-[#151e30] text-slate-500">
            <span className="text-xl">▤</span>
          </div>

          <p className="mt-4 text-sm font-medium text-slate-300">
            暂无最近项目
          </p>

          <p className="mt-2 text-xs text-slate-600">
            开始创作后，你的项目将在这里展示
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className="rounded-xl border border-slate-800 bg-[#0c1321] p-4 transition hover:border-violet-500/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-400">
                  <span className="text-lg">▶</span>
                </div>

                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                  已完成
                </span>
              </div>

              <Link
                href={`/projects/${project.id}`}
                className="mt-4 block"
              >
                <h3 className="truncate text-sm font-semibold text-slate-100 transition hover:text-violet-400">
                  {project.name}
                </h3>
              </Link>

              <p className="mt-2 truncate text-xs text-slate-500">
                原始文件：{project.sourceName}
              </p>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p>
                  裁剪区间：{project.parameters.start}s - {project.parameters.end}s
                </p>

                <p>
                  输出大小：
                  {project.outputBlob
                    ? formatFileSize(project.outputBlob.size)
                    : '暂无输出文件'}
                </p>

                <p>
                  创建时间：
                  {new Date(project.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3">
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-2.5 text-xs font-medium text-violet-300 transition hover:border-violet-400/60 hover:bg-violet-500/20"
                >
                  查看详情
                </Link>

                <button
                  type="button"
                  onClick={() => handleDownload(project)}
                  disabled={!project.outputBlob || deletingId === project.id}
                  className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  下载成品
                </button>

                <button
                  type="button"
                  onClick={() => void handleDelete(project)}
                  disabled={deletingId !== null}
                  className="rounded-lg border border-red-900/50 bg-red-950/20 px-2 py-2.5 text-xs font-medium text-red-400 transition hover:border-red-500/50 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deletingId === project.id
                    ? '删除中...'
                    : '删除项目'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}