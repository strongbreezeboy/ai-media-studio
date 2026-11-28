
import type { ChangeEvent, DragEvent, RefObject } from 'react';

interface MediaUploadPanelProps {
  file: File | null;
  isDragging: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onRemoveFile: () => void;
  formatSize: (size: number) => string;
}

export function MediaUploadPanel({
  file,
  isDragging,
  fileInputRef,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  formatSize,
}: MediaUploadPanelProps) {
  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`min-w-0 rounded-2xl border p-4 transition-colors ${
        isDragging
          ? 'border-violet-400 bg-violet-500/10'
          : 'border-slate-800 bg-[#101827]'
      }`}
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-100">
          素材库
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          上传和管理你的音视频素材
        </p>
      </div>

      {isDragging && (
        <div className="mb-4 rounded-xl border-2 border-dashed border-violet-400 bg-violet-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-violet-300">
            松开鼠标，上传媒体文件
          </p>
          <p className="mt-2 text-xs text-slate-400">
            支持视频和音频文件
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        className="block w-full min-w-0 cursor-pointer rounded-lg border border-slate-700 bg-[#080b14] p-3 text-xs text-slate-300"
        type="file"
        accept="video/*,audio/*"
        onChange={onFileChange}
      />

      {file ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/70 p-3">
          <p className="break-all text-sm font-medium text-slate-200">
            {file.name}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {formatSize(file.size)}
          </p>

          <button
            type="button"
            onClick={onRemoveFile}
            className="mt-3 w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/20"
          >
            删除素材
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          支持浏览器可解码的视频和音频格式，也可以直接拖拽文件到这里
        </p>
      )}
    </section>
  );
}
