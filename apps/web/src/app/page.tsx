
'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';

import {
  getMediaFileInfo,
  readMediaMetadata,
  MediaTaskManager,
  type MediaMetadata,
  type MediaTask,
} from '@xinmark/media-core';


export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 记录当前媒体元数据解析请求，防止旧请求覆盖新结果。
  const metadataRequestIdRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  // 保存当前任务列表，任务变化时触发 React 重新渲染。
  const [tasks, setTasks] = useState<MediaTask[]>([]);
  // 保存任务管理器实例，避免组件重新渲染时重新创建。
  const [taskManager] = useState(
    () => new MediaTaskManager()
  );
  useEffect(() => {
    if (!previewUrl) return;

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  /**
    页面加载后，订阅任务变化。
    MediaTaskManager 每次调用 notify()，都会通知订阅者。
    setTasks() 更新 React 状态。
    页面自动重新渲染任务列表。
    页面卸载时，取消订阅，避免监听器残留。
  */
  useEffect(() => {
    const unsubscribe = taskManager.subscribe((nextTasks) => {
      setTasks(nextTasks);
    });

    return unsubscribe;
  }, [taskManager]);

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      await handleSelectFile(selectedFile);
    }
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();

    // 鼠标只是进入子元素时，不取消拖拽状态
    if (
      event.currentTarget.contains(
        event.relatedTarget as Node | null
      )
    ) {
      return;
    }

    setIsDragging(false);
  }

  async function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (!droppedFile) return;

    await handleSelectFile(droppedFile);
  }


  async function handleSelectFile(selectedFile: File) {
    const info = getMediaFileInfo(selectedFile);

    // 先检查文件类型
    if (info.kind !== 'video' && info.kind !== 'audio') {
      setError('请选择视频或音频文件');
      return;
    }

    // 为本次解析分配唯一请求编号
    const requestId = ++metadataRequestIdRef.current;

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setMetadata(null);
    setError('');
    setLoading(true);

    try {
      const result = await readMediaMetadata(selectedFile);

      // 如果已经有更新的请求，则忽略当前旧结果
      if (requestId !== metadataRequestIdRef.current) {
        return;
      }

      setMetadata(result);
    } catch (err) {
      if (requestId !== metadataRequestIdRef.current) {
        return;
      }

      setError(
        err instanceof Error ? err.message : '文件解析失败'
      );
    } finally {
      // 只有当前请求才能结束加载状态
      if (requestId === metadataRequestIdRef.current) {
        setLoading(false);
      }
    }
  }


  function handleRemoveFile() {
    metadataRequestIdRef.current++;
    setFile(null);
    setPreviewUrl('');
    setMetadata(null);
    setError('');
    setLoading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // 创建任务
  function handleCreateTask() {
    if (!file) return;

    const type = file.type.startsWith('video/')
      ? 'video-process'
      : 'audio-process';

    // 创建任务，设置 8 秒超时
    const task = taskManager.create({
      type,
      timeout: 8000,
    });

    // 提交任务，开始模拟执行
    void taskManager.run(task.id, async ({
      signal,
      onProgress,
      onCleanup,
    }) => {
      const totalSteps = 10;

      for (let step = 1; step <= totalSteps; step++) {
        // 模拟每一步处理耗时 500ms
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            signal.removeEventListener('abort', handleAbort);
            resolve();
          }, 500);

          const handleAbort = () => {
            clearTimeout(timer);
            reject(new Error('模拟任务已中断'));
          };

          signal.addEventListener(
            'abort',
            handleAbort,
            { once: true }
          );

          // 注册资源清理函数
          onCleanup(() => {
            clearTimeout(timer);
            signal.removeEventListener('abort', handleAbort);
          });

          // 防止注册监听器前任务已经取消
          if (signal.aborted) {
            handleAbort();
          }
        });

        // 更新任务进度
        onProgress(step * 10);
      }

      return '模拟媒体处理完成';
    }).catch(() => {
      // 任务状态和错误由 MediaTaskManager 管理
      // 避免取消或失败时产生未处理的 Promise rejection
    });
  }

  // 取消任务
  function handleCancelTask(taskId: string) {
    taskManager.cancel(taskId);
  }


  function formatDuration(seconds: number) {
    if (!Number.isFinite(seconds)) return '未知';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  function formatSize(size: number) {
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold">
          AI Media Studio
        </h1>

        <p className="mt-3 text-slate-400">
          在线音视频处理工作台
        </p>
        {file && (
          <button
            type="button"
            onClick={handleCreateTask}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium hover:bg-blue-500"
          >
            创建处理任务
          </button>
        )}

        <section
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mt-10 rounded-2xl border p-8 transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-slate-700 bg-slate-900'
          }`}
        >
          <h2 className="text-xl font-semibold">
            上传媒体文件
          </h2>
          {isDragging && (
            <div className="mb-5 rounded-xl border-2 border-dashed border-blue-400 bg-blue-500/10 p-8 text-center">
              <p className="text-lg font-semibold text-blue-400">
                松开鼠标，上传媒体文件
              </p>
              <p className="mt-2 text-sm text-slate-400">
                支持视频和音频文件
              </p>
            </div>
          )}

          <p className="mt-2 text-sm text-slate-400">
            支持浏览器可解码的视频和音频格式
          </p>

          <input
            ref={fileInputRef}
            className="mt-6 block w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-4 text-sm"
            type="file"
            accept="video/*,audio/*"
            onChange={handleFileChange}
          />
          {file && (
            <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-800 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatSize(file.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="ml-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
              >
                删除文件
              </button>
            </div>
          )}
        </section>
        {tasks.length > 0 && (
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
                        {task.type === 'video-process'
                          ? '视频处理任务'
                          : '音频处理任务'}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        任务 ID：{task.id}
                      </p>
                    </div>

                    <span className="rounded-md bg-slate-700 px-3 py-1 text-xs">
                      {task.status === 'pending' && '等待中'}
                      {task.status === 'processing' && '处理中'}
                      {task.status === 'completed' && '已完成'}
                      {task.status === 'failed' && '失败'}
                      {task.status === 'cancelled' && '已取消'}
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      进度
                    </span>

                    <span className="text-xs text-slate-300">
                      {task.progress}%
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
                      onClick={() => handleCancelTask(task.id)}
                      className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
                    >
                      取消任务
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <p className="mt-6 text-blue-400">
            正在解析媒体文件...
          </p>
        )}

        {error && (
          <p className="mt-6 text-red-400">
            {error}
          </p>
        )}

        {file && previewUrl && (
          <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold">
              媒体预览
            </h2>

            <div className="mt-6">
              {file.type.startsWith('video/') ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="max-h-[480px] w-full rounded-xl bg-black"
                />
              ) : file.type.startsWith('audio/') ? (
                <audio
                  src={previewUrl}
                  controls
                  className="w-full"
                />
              ) : null}
            </div>

            <h3 className="mt-8 font-semibold">
              文件信息
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="文件名称" value={file.name} />
              <Info label="文件大小" value={formatSize(file.size)} />
              <Info label="MIME 类型" value={file.type || '未知'} />
              <Info
                label="媒体类型"
                value={metadata?.kind ?? '解析中'}
              />
              <Info
                label="媒体时长"
                value={
                  metadata
                    ? formatDuration(metadata.duration)
                    : '解析中'
                }
              />

              {metadata?.kind === 'video' && (
                <Info
                  label="视频分辨率"
                  value={`${metadata.width} × ${metadata.height}`}
                />
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm">{value}</p>
    </div>
  );
}
