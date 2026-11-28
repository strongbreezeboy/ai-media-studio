
interface VideoTrimmerPanelProps {
  videoDuration: number;
  trimStart: string;
  trimEnd: string;
  trimDuration: number;
  startPercent: number;
  endPercent: number;
  playheadPercent: number;
  isProcessing: boolean;
  onTrimStartChange: (value: string) => void;
  onTrimEndChange: (value: string) => void;
  onSeekVideo: (time: number) => void;
  onTimelineClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTimelinePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onCreateTask: () => void;
}

export function VideoTrimmerPanel({
  videoDuration,
  trimStart,
  trimEnd,
  trimDuration,
  startPercent,
  endPercent,
  playheadPercent,
  isProcessing,
  onTrimStartChange,
  onTrimEndChange,
  onSeekVideo,
  onTimelineClick,
  onTimelinePointerMove,
  onCreateTask,
}: VideoTrimmerPanelProps) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-8">
      <h2 className="text-xl font-semibold">视频裁剪</h2>

      <p className="mt-2 text-sm text-slate-400">
        设置开始和结束时间，裁剪出需要的视频片段。单位：秒。
      </p>

      <div className="mt-8">
        <div className="mb-4 flex justify-between text-sm text-slate-400">
          <span>视频时间轴</span>
          <span>{videoDuration.toFixed(2)} 秒</span>
        </div>

        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <label className="text-blue-300">开始时间</label>
            <div className="flex items-center gap-3">
              <span>{Number(trimStart).toFixed(1)} 秒</span>
              <button
                type="button"
                onClick={() => onSeekVideo(Number(trimStart))}
                className="rounded-md bg-blue-500/10 px-3 py-1 text-xs text-blue-300 hover:bg-blue-500/20"
              >
                定位视频
              </button>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={videoDuration}
            step="0.1"
            value={Number(trimStart)}
            onChange={(event) => onTrimStartChange(event.target.value)}
            className="w-full cursor-pointer accent-blue-500"
            aria-label="裁剪开始时间"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <label className="text-blue-300">结束时间</label>
            <div className="flex items-center gap-3">
              <span>{Number(trimEnd).toFixed(1)} 秒</span>
              <button
                type="button"
                onClick={() => onSeekVideo(Number(trimEnd))}
                className="rounded-md bg-blue-500/10 px-3 py-1 text-xs text-blue-300 hover:bg-blue-500/20"
              >
                定位视频
              </button>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={videoDuration}
            step="0.1"
            value={Number(trimEnd)}
            onChange={(event) => onTrimEndChange(event.target.value)}
            className="w-full cursor-pointer accent-blue-500"
            aria-label="裁剪结束时间"
          />
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div>
            <p className="text-sm text-slate-400">裁剪区间</p>
            <p className="mt-1 font-medium text-white">
              {Number(trimStart).toFixed(2)} 秒
              {' - '}
              {Number(trimEnd).toFixed(2)} 秒
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-400">预计输出时长</p>
            <p className="mt-1 text-xl font-semibold text-blue-400">
              {trimDuration.toFixed(2)} 秒
            </p>
          </div>
        </div>

        <div
          onClick={onTimelineClick}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = Math.max(
              0,
              Math.min(1, (event.clientX - rect.left) / rect.width)
            );
            onSeekVideo(ratio * videoDuration);
          }}
          onPointerMove={onTimelinePointerMove}
          className="relative mt-4 h-4 cursor-pointer touch-none rounded-full bg-slate-700"
          title="点击或拖动时间轴浏览视频"
        >
          <div
            className="absolute top-0 h-full rounded-full bg-blue-500"
            style={{
              left: `${startPercent}%`,
              width: `${Math.max(0, endPercent - startPercent)}%`,
            }}
          />

          <div
            className="absolute -top-2 z-10 h-8 w-1 rounded-full bg-amber-400 shadow-lg"
            style={{
              left: `${playheadPercent}%`,
              transform: 'translateX(-50%)',
            }}
          />
        </div>

        <div className="mt-3 flex justify-between text-xs text-slate-400">
          <span>0 秒</span>
          <span>{videoDuration.toFixed(1)} 秒</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            开始时间（秒）
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={trimStart}
            onChange={(event) => onTrimStartChange(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            结束时间（秒）
          </label>
          <input
            type="number"
            min={Number(trimStart) + 0.1}
            max={videoDuration}
            step="0.1"
            value={trimEnd}
            onChange={(event) => onTrimEndChange(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onCreateTask}
        disabled={isProcessing}
        className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        开始裁剪
      </button>
    </section>
  );
}
