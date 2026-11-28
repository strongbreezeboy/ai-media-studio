
'use client';

import { useEffect } from 'react';

import { useMediaFile } from '@/hooks/use-media-file';
import { useVideoPlayer } from '@/hooks/use-video-player';
import { useVideoTrimmer } from '@/hooks/use-video-trimmer';
import { useMediaTasks } from '@/hooks/use-media-tasks';
import { useVideoTrimTask } from '@/hooks/use-video-trim-task';

import { MediaUploadPanel } from '@/components/media-upload-panel';
import { MediaPreviewPanel } from '@/components/media-preview-panel';
import { MediaTaskList } from '@/components/media-task-list';
import { TrimmedVideoResult } from '@/components/trimmed-video-result';
import { VideoTimelinePanel } from '@/components/video-timeline-panel';
import { VideoInspectorPanel } from '@/components/video-inspector-panel';

import { formatDuration, formatSize } from '@/lib/media-format';

export function VideoWorkspace() {
  const {
    file,
    previewUrl,
    metadata,
    loading,
    error,
    setError,
    isDragging,
    fileInputRef,
    handleSelectFile: selectMediaFile,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveFile: removeMediaFile,
  } = useMediaFile();

  const { engine, tasks, cancelTask } = useMediaTasks();

  const isProcessing = tasks.some(
    (task) =>
      task.status === 'pending' ||
      task.status === 'processing'
  );

  const videoDuration =
    metadata?.kind === 'video' ? metadata.duration : 0;

  const {
    trimStart,
    trimEnd,
    resetTrim,
    startPercent,
    endPercent,
    trimDuration,
    handleTrimStartChange,
    handleTrimEndChange,
  } = useVideoTrimmer(videoDuration);

  useEffect(() => {
    if (metadata?.kind === 'video') {
      resetTrim(metadata.duration);
    }
  }, [metadata, resetTrim]);

  const {
    videoRef,
    currentTime,
    setCurrentTime,
    handleVideoTimeUpdate,
    handleSeekVideo,
    handleTimelineClick,
    handleTimelinePointerMove,
  } = useVideoPlayer(videoDuration);

  const { trimmedUrl, handleCreateTask } = useVideoTrimTask({
    engine,
    file,
    videoDuration,
    trimStart,
    trimEnd,
    setError,
  });

  async function handleSelectFile(selectedFile: File) {
    setCurrentTime(0);
    await selectMediaFile(selectedFile);
  }

  function handleRemoveFile() {
    setCurrentTime(0);
    removeMediaFile();
  }

  const playheadPercent =
    videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  const isVideo = metadata?.kind === 'video';

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
            AI MEDIA STUDIO
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            视频工作台
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            管理素材、预览内容并调整视频处理参数
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#101827] px-3 py-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isProcessing
                ? 'animate-pulse bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-xs text-slate-400">
            {isProcessing ? '任务处理中' : '工作台就绪'}
          </span>
        </div>
      </header>

      <section className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
        <aside className="min-w-0">
          <MediaUploadPanel
            file={file}
            isDragging={isDragging}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onRemoveFile={handleRemoveFile}
            formatSize={formatSize}
          />
        </aside>

        <section className="min-w-0">
          {file && previewUrl ? (
            <MediaPreviewPanel
              file={file}
              previewUrl={previewUrl}
              videoRef={videoRef}
              currentTime={currentTime}
              videoDuration={videoDuration}
              metadata={metadata}
              formatSize={formatSize}
              formatDuration={formatDuration}
              onVideoTimeUpdate={handleVideoTimeUpdate}
            />
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#101827] px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-8 w-8 text-violet-400"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="m10 9 5 3-5 3V9Z" />
                </svg>
              </div>

              <h2 className="mt-5 text-base font-semibold text-slate-200">
                还没有媒体素材
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                从左侧素材库上传视频或音频文件，开始你的创作。
              </p>
            </div>
          )}

          {loading && (
            <p className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-sm text-blue-300">
              正在解析媒体文件...
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
        </section>

        <aside className="min-w-0">
          {isVideo ? (
            <VideoInspectorPanel
              videoDuration={videoDuration}
              trimStart={trimStart}
              trimEnd={trimEnd}
              trimDuration={trimDuration}
              isProcessing={isProcessing}
              onTrimStartChange={handleTrimStartChange}
              onTrimEndChange={handleTrimEndChange}
              onSeekVideo={handleSeekVideo}
              onCreateTask={handleCreateTask}
            />
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
              <h2 className="text-base font-semibold text-white">
                参数检查器
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                媒体处理参数
              </p>
              <div className="mt-5 rounded-lg border border-slate-800 bg-[#0c1422] p-4">
                <p className="text-sm font-medium text-slate-300">
                  {file?.type.startsWith('audio/')
                    ? '音频素材'
                    : '等待素材'}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {file
                    ? '当前工作台暂未开放该素材类型的参数编辑。'
                    : '上传视频后，可在这里调整裁剪区间和处理参数。'}
                </p>
              </div>
            </div>
          )}
        </aside>
      </section>

      {isVideo && (
        <VideoTimelinePanel
          videoDuration={videoDuration}
          startPercent={startPercent}
          endPercent={endPercent}
          playheadPercent={playheadPercent}
          onSeekVideo={handleSeekVideo}
          onTimelineClick={handleTimelineClick}
          onTimelinePointerMove={handleTimelinePointerMove}
        />
      )}

      <section className="rounded-xl border border-slate-800 bg-[#101827] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              处理任务
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              查看任务进度和处理结果
            </p>
          </div>

          <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400">
            {tasks.length} 个任务
          </span>
        </div>

        <MediaTaskList tasks={tasks} onCancelTask={cancelTask} />

        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center">
            <p className="text-sm text-slate-500">暂无处理任务</p>
            <p className="mt-1 text-xs text-slate-600">
              创建视频处理任务后，会显示在这里
            </p>
          </div>
        )}
      </section>

      {trimmedUrl && <TrimmedVideoResult url={trimmedUrl} />}
    </div>
  );
}
