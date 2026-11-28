
import type { RefObject } from 'react';
import type { MediaMetadata } from '@xinmark/media-core';

interface MediaPreviewPanelProps {
  file: File;
  previewUrl: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  currentTime: number;
  videoDuration: number;
  metadata: MediaMetadata | null;
  formatSize: (size: number) => string;
  formatDuration: (duration: number) => string;
  onVideoTimeUpdate: () => void;
}

export function MediaPreviewPanel({
  file,
  previewUrl,
  videoRef,
  currentTime,
  videoDuration,
  metadata,
  formatSize,
  formatDuration,
  onVideoTimeUpdate,
}: MediaPreviewPanelProps) {
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');

  return (
    <section className="min-w-0 rounded-xl border border-slate-800 bg-[#101827] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">
            媒体预览
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            预览素材并查看媒体信息
          </p>
        </div>

        <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400">
          {isVideo ? 'VIDEO' : isAudio ? 'AUDIO' : 'MEDIA'}
        </span>
      </div>

      <div className="mt-4 flex min-h-[240px] items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-[#080d18] p-3">
        {isVideo ? (
          <video
            ref={videoRef}
            src={previewUrl}
            controls
            playsInline
            onTimeUpdate={onVideoTimeUpdate}
            className="max-h-[420px] w-full rounded-md bg-black"
          />
        ) : isAudio ? (
          <div className="w-full max-w-xl rounded-lg border border-slate-800 bg-[#101827] p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-xl text-violet-300">
                ♪
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  音频预览
                </p>
              </div>
            </div>
            <audio
              src={previewUrl}
              controls
              className="w-full"
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            暂不支持预览此文件类型
          </p>
        )}
      </div>

      {isVideo && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            当前播放：
            <span className="ml-1 font-medium text-slate-200">
              {currentTime.toFixed(2)} 秒
            </span>
          </span>

          <span>
            总时长：
            <span className="ml-1 font-medium text-slate-200">
              {videoDuration.toFixed(2)} 秒
            </span>
          </span>
        </div>
      )}

      <div className="mt-5 border-t border-slate-800 pt-4">
        <h3 className="text-sm font-semibold text-slate-200">
          文件信息
        </h3>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
      </div>
    </section>
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
    <div className="min-w-0 rounded-lg border border-slate-800 bg-[#0c1422] p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm text-slate-200">
        {value}
      </p>
    </div>
  );
}
