
interface VideoInspectorPanelProps {
  videoDuration: number;
  trimStart: string;
  trimEnd: string;
  trimDuration: number;
  isProcessing: boolean;
  onTrimStartChange: (value: string) => void;
  onTrimEndChange: (value: string) => void;
  onSeekVideo: (time: number) => void;
  onCreateTask: () => void;
}

export function VideoInspectorPanel({
  videoDuration,
  trimStart,
  trimEnd,
  trimDuration,
  isProcessing,
  onTrimStartChange,
  onTrimEndChange,
  onSeekVideo,
  onCreateTask,
}: VideoInspectorPanelProps) {
  return (
    <aside className="rounded-2xl border border-slate-800 bg-[#101827] p-5">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-base font-semibold text-slate-100">
          编辑参数
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          调整视频裁剪范围和输出时长
        </p>
      </div>

      <div className="mt-5 space-y-6">
        {/* 开始时间 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="trim-start"
              className="text-sm text-slate-300"
            >
              开始时间
            </label>

            <button
              type="button"
              onClick={() => onSeekVideo(Number(trimStart))}
              className="rounded-md bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300 transition hover:bg-violet-500/20"
            >
              定位
            </button>
          </div>

          <input
            id="trim-start"
            type="number"
            min="0"
            max={videoDuration}
            step="0.1"
            value={trimStart}
            onChange={(event) => onTrimStartChange(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-[#080b14] px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-500"
          />

          <input
            type="range"
            min="0"
            max={videoDuration}
            step="0.1"
            value={Number(trimStart) || 0}
            onChange={(event) => onTrimStartChange(event.target.value)}
            className="mt-3 w-full cursor-pointer accent-violet-500"
            aria-label="调整裁剪开始时间"
          />
        </div>

        {/* 结束时间 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="trim-end"
              className="text-sm text-slate-300"
            >
              结束时间
            </label>

            <button
              type="button"
              onClick={() => onSeekVideo(Number(trimEnd))}
              className="rounded-md bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300 transition hover:bg-violet-500/20"
            >
              定位
            </button>
          </div>

          <input
            id="trim-end"
            type="number"
            min={Number(trimStart) + 0.1}
            max={videoDuration}
            step="0.1"
            value={trimEnd}
            onChange={(event) => onTrimEndChange(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-[#080b14] px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-500"
          />

          <input
            type="range"
            min="0"
            max={videoDuration}
            step="0.1"
            value={Number(trimEnd) || 0}
            onChange={(event) => onTrimEndChange(event.target.value)}
            className="mt-3 w-full cursor-pointer accent-violet-500"
            aria-label="调整裁剪结束时间"
          />
        </div>

        {/* 输出时长 */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="text-xs text-slate-400">
            预计输出时长
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-violet-300">
            {trimDuration.toFixed(2)}
            <span className="ml-1 text-sm font-normal text-slate-400">
              秒
            </span>
          </p>
        </div>

        {/* 执行裁剪 */}
        <button
          type="button"
          onClick={onCreateTask}
          disabled={isProcessing}
          className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? '正在处理中...' : '开始裁剪'}
        </button>
      </div>
    </aside>
  );
}
