// 视频播放、时间同步、时间轴点击和拖动逻辑
import { useRef, useState } from 'react';

import type {
  MouseEvent,
  PointerEvent,
} from 'react';

export function useVideoPlayer(duration: number) {
  // 视频 DOM 元素
  const videoRef = useRef<HTMLVideoElement>(null);

  // 当前视频播放时间
  const [currentTime, setCurrentTime] = useState(0);

  // 是否正在拖动播放指针
  const [isSeeking, setIsSeeking] = useState(false);

  // 视频播放时同步当前时间
  function handleVideoTimeUpdate() {
    if (!videoRef.current) return;

    setCurrentTime(videoRef.current.currentTime);
  }

  // 跳转到指定视频时间
  function handleSeekVideo(time: number) {
    const video = videoRef.current;

    if (!video || !Number.isFinite(time)) return;

    video.currentTime = Math.max(
      0,
      Math.min(time, duration)
    );

    setCurrentTime(video.currentTime);
  }

  // 点击时间轴，跳转到对应的视频时间
  function handleTimelineClick(
    event: MouseEvent<HTMLDivElement>
  ) {
    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width <= 0 || duration <= 0) return;

    const position = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width)
    );

    handleSeekVideo(position * duration);
  }

  // 拖动时间轴播放指针
  function handleTimelinePointerMove(
    event: PointerEvent<HTMLDivElement>
  ) {
    if (!isSeeking) return;

    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width <= 0 || duration <= 0) return;

    const position = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width)
    );

    handleSeekVideo(position * duration);
  }

  return {
    videoRef,
    currentTime,
    isSeeking,
    setCurrentTime,
    setIsSeeking,
    handleVideoTimeUpdate,
    handleSeekVideo,
    handleTimelineClick,
    handleTimelinePointerMove,
  };
}
