'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  deleteProject,
  getProjectById,
  type MediaProject,
} from '@/lib/project-storage';

interface ProjectDetailProps {
  projectId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(blob: Blob): string {
  if (blob.type.includes('webm')) return 'webm';
  if (blob.type.includes('quicktime')) return 'mov';
  return 'mp4';
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter();

  const [project, setProject] = useState<MediaProject | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    async function loadProject() {
      try {
        const result = await getProjectById(projectId);

        if (!active) return;

        if (!result) {
          setError('项目不存在，可能已被删除');
          return;
        }

        setProject(result);

        if (result.outputBlob) {
          objectUrl = URL.createObjectURL(result.outputBlob);
          setVideoUrl(objectUrl);
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

    void loadProject();

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [projectId]);

  function handleDownload() {
    if (!project?.outputBlob) return;

    const url = URL.createObjectURL(project.outputBlob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${project.name}.${getFileExtension(project.outputBlob)}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleDelete() {
    if (!project) return;

    const confirmed = window.confirm(
      `确定删除项目「${project.name}」吗？删除后无法恢复。`,
    );

    if (!confirmed) return;

    try {
      await deleteProject(project.id);
      router.push('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '删除项目失败',
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-800 bg-[#101827]">
        <p className="text-sm text-slate-500">
          正在加载项目...
        </p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-[#101827] p-8 text-center">
        <p className="text-sm text-red-400">{error}</p>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-5 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          返回首页
        </button>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* 项目头部 */}
      <section className="rounded-xl border border-slate-800 bg-[#101827] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-violet-500" />

              <span className="text-xs text-slate-500">
                项目详情
              </span>
            </div>

            <h1 className="mt-3 break-all text-xl font-semibold text-white md:text-2xl">
              {project.name}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              创建于{' '}
              {new Date(project.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>

          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {project.status === 'completed' ? '已完成' : '失败'}
          </span>
        </div>
      </section>

      {/* 视频预览 */}
      <section className="rounded-xl border border-slate-800 bg-[#101827] p-5 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-blue-500" />

          <h2 className="text-lg font-semibold text-white">
            成品预览
          </h2>
        </div>

        {videoUrl ? (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-black">
            <video
              src={videoUrl}
              controls
              playsInline
              className="max-h-[600px] w-full bg-black"
            />
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#0c1321]">
            <p className="text-sm text-slate-500">
              当前项目没有可预览的视频
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!project.outputBlob}
            className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            下载成品
          </button>

          <button
            type="button"
            onClick={() => router.push('/video')}
            className="rounded-lg border border-slate-700 bg-[#151e30] px-5 py-3 text-sm text-slate-300 transition hover:border-violet-500/40 hover:bg-[#1a263a]"
          >
            新建视频处理
          </button>
        </div>
      </section>

      {/* 项目信息 */}
      <section className="rounded-xl border border-slate-800 bg-[#101827] p-5 md:p-6">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-blue-500" />

          <h2 className="text-lg font-semibold text-white">
            项目信息
          </h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-[#0c1321] p-4">
            <p className="text-xs text-slate-500">
              原始文件
            </p>

            <p className="mt-2 break-all text-sm text-slate-200">
              {project.sourceName}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0c1321] p-4">
            <p className="text-xs text-slate-500">
              处理类型
            </p>

            <p className="mt-2 text-sm text-slate-200">
              {project.type}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0c1321] p-4">
            <p className="text-xs text-slate-500">
              裁剪开始时间
            </p>

            <p className="mt-2 text-sm text-slate-200">
              {project.parameters.start} 秒
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0c1321] p-4">
            <p className="text-xs text-slate-500">
              裁剪结束时间
            </p>

            <p className="mt-2 text-sm text-slate-200">
              {project.parameters.end} 秒
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0c1321] p-4">
            <p className="text-xs text-slate-500">
              输出文件大小
            </p>

            <p className="mt-2 text-sm text-slate-200">
              {project.outputBlob
                ? formatFileSize(project.outputBlob.size)
                : '暂无'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0c1321] p-4">
            <p className="text-xs text-slate-500">
              最近更新时间
            </p>

            <p className="mt-2 text-sm text-slate-200">
              {new Date(project.updatedAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
      </section>

      {/* 删除项目 */}
      <section className="rounded-xl border border-red-900/30 bg-[#101827] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              删除项目
            </h2>

            <p className="mt-2 text-xs text-slate-500">
              删除项目后，保存的成品和项目记录将一并删除，无法恢复。
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-2.5 text-sm text-red-400 transition hover:border-red-500/50 hover:bg-red-950/40"
          >
            删除项目
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}