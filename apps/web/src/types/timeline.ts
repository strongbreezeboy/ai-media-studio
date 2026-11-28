
import type { MediaMetadata } from '@xinmark/media-core';

/** 时间轴轨道类型 */
export type TimelineTrackType = 'video' | 'audio';

/** 时间轴片段 */
export interface TimelineClip {
  id: string;
  trackId: string;

  /** 原始素材文件 */
  file: File;

  /** 素材名称 */
  name: string;

  /** 素材类型 */
  mediaType: TimelineTrackType;

  /** 原始素材中的开始时间 */
  sourceStart: number;

  /** 原始素材中的结束时间 */
  sourceEnd: number;

  /** 片段在项目时间轴上的开始位置 */
  timelineStart: number;

  /** 片段在项目时间轴上的持续时间 */
  duration: number;
}

/** 时间轴轨道 */
export interface TimelineTrack {
  id: string;
  name: string;
  type: TimelineTrackType;
  clips: TimelineClip[];
}

/** 创建时间轴片段时使用的媒体信息 */
export type TimelineMediaMetadata = MediaMetadata;
