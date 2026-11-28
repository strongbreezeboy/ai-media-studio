
interface VideoTimelinePanelProps {
  videoDuration: number;
  startPercent: number;
  endPercent: number;
  playheadPercent: number;
  onSeekVideo: (time: number) => void;
  onTimelineClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTimelinePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
}

function formatTimelineTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function VideoTimelinePanel({
  videoDuration,
  startPercent,
  endPercent,
  playheadPercent,
  onSeekVideo,
  onTimelineClick,
  onTimelinePointerMove,
}: VideoTimelinePanelProps) {
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const percent = index * 25;

    return {
      percent,
      time: videoDuration * (percent / 100),
    };
  });

  return (
    <section className="min-w-0 rounded-2xl border border-slate-800 bg-[#101827] p-5">
      {/* 时间轴标题 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            多轨时间轴
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            管理媒体片段和播放位置
          </p>
        </div>

        <div className="rounded-md border border-slate-700 bg-[#0c1422] px-3 py-1.5 text-xs tabular-nums text-slate-300">
          总时长 {formatTimelineTime(videoDuration)}
        </div>
      </div>

      {/* 时间轴主体 */}
      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* 时间标尺 */}
          <div className="relative ml-[100px] h-9 border-b border-slate-700">
            {ticks.map((tick) => (
              <div
                key={tick.percent}
                className="absolute bottom-0 flex h-full flex-col items-center"
                style={{
                  left: `${tick.percent}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <span className="mb-1 text-[10px] tabular-nums text-slate-500">
                  {formatTimelineTime(tick.time)}
                </span>
                <span className="h-2 w-px bg-slate-600" />
              </div>
            ))}
          </div>

          {/* 视频轨道 */}
          <div className="mt-3 flex min-h-[58px]">
            <div className="flex w-[100px] shrink-0 items-center gap-2 pr-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/15 text-xs font-semibold text-violet-300">
                V1
              </span>
              <span className="text-xs text-slate-300">
                视频轨道
              </span>
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
              className="relative h-[58px] flex-1 cursor-pointer touch-none overflow-visible rounded-lg border border-slate-700 bg-[#080d18]"
              title="点击或拖动视频轨道定位"
            >
              {/* 视频素材片段 */}
              <div className="absolute inset-y-1 left-0 right-0 overflow-hidden rounded-md border border-blue-400/40 bg-gradient-to-r from-blue-600/40 to-indigo-600/40">
                <div className="flex h-full items-center px-3">
                  <span className="truncate text-xs font-medium text-blue-100">
                    视频素材
                  </span>
                </div>
              </div>

              {/* 裁剪范围 */}
              <div
                className="absolute inset-y-0 z-[1] border-x-2 border-violet-300 bg-violet-400/20"
                style={{
                  left: `${startPercent}%`,
                  width: `${Math.max(0, endPercent - startPercent)}%`,
                }}
              />

              {/* 播放头 */}
              <div
                className="pointer-events-none absolute -top-7 bottom-[-12px] z-20 w-0.5 bg-amber-400"
                style={{
                  left: `${playheadPercent}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="absolute -left-[5px] top-0 h-3 w-3 rounded-sm bg-amber-400" />
              </div>
            </div>
          </div>

          {/* 音频轨道预留区域 */}
          <div className="mt-2 flex min-h-[58px]">
            <div className="flex w-[100px] shrink-0 items-center gap-2 pr-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 text-xs font-semibold text-emerald-300">
                A1
              </span>
              <span className="text-xs text-slate-300">
                音频轨道
              </span>
            </div>

            <div className="flex flex-1 items-center rounded-lg border border-dashed border-slate-700 bg-[#0c1422] px-3">
              <span className="text-xs text-slate-600">
                音频素材轨道 · 后续支持独立添加
              </span>
            </div>
          </div>

          {/* 轨道说明 */}
          <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-slate-800 pt-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
              <span>视频素材</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" />
              <span>裁剪区间</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-0.5 bg-amber-400" />
              <span>播放头</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
