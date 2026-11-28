
import { useMemo, useState } from 'react';

import type { MediaMetadata } from '@xinmark/media-core';

import type {
  TimelineClip,
  TimelineTrack,
} from '@/types/timeline';

interface UseTimelineOptions {
  file: File | null;
  metadata: MediaMetadata | null;
}

interface TimelineEdits {
  file: File | null;
  metadata: MediaMetadata | null;
  removedClipIds: string[];
  cleared: boolean;
}

export function useTimeline({
  file,
  metadata,
}: UseTimelineOptions) {
  // 保存用户对当前素材时间轴的操作
  const [edits, setEdits] = useState<TimelineEdits>({
    file: null,
    metadata: null,
    removedClipIds: [],
    cleared: false,
  });

  // 判断当前操作记录是否属于当前素材
  const isCurrentSource =
    edits.file === file &&
    edits.metadata === metadata;

  // 根据当前素材生成时间轴片段
  const sourceClip = useMemo<TimelineClip | null>(() => {
    if (
      !file ||
      !metadata ||
      (metadata.kind !== 'video' && metadata.kind !== 'audio') ||
      !Number.isFinite(metadata.duration) ||
      metadata.duration <= 0
    ) {
      return null;
    }

    const trackId =
      metadata.kind === 'video' ? 'video-1' : 'audio-1';

    return {
      id: `clip-${file.name}-${file.lastModified}-${metadata.kind}`,
      trackId,
      file,
      name: file.name,
      mediaType: metadata.kind,
      sourceStart: 0,
      sourceEnd: metadata.duration,
      timelineStart: 0,
      duration: metadata.duration,
    };
  }, [file, metadata]);

  // 读取当前素材对应的用户操作
  const removedClipIds = isCurrentSource
    ? edits.removedClipIds
    : [];

  const isCleared = isCurrentSource && edits.cleared;

  // 生成视频和音频轨道
  const tracks = useMemo<TimelineTrack[]>(() => {
    const visibleClip =
      sourceClip &&
      !isCleared &&
      !removedClipIds.includes(sourceClip.id)
        ? sourceClip
        : null;

    return [
      {
        id: 'video-1',
        name: '视频轨道',
        type: 'video',
        clips:
          visibleClip?.mediaType === 'video'
            ? [visibleClip]
            : [],
      },
      {
        id: 'audio-1',
        name: '音频轨道',
        type: 'audio',
        clips:
          visibleClip?.mediaType === 'audio'
            ? [visibleClip]
            : [],
      },
    ];
  }, [sourceClip, removedClipIds, isCleared]);

  // 所有轨道中的片段
  const clips = useMemo(
    () => tracks.flatMap((track) => track.clips),
    [tracks]
  );

  // 项目时间轴总时长
  const totalDuration = useMemo(() => {
    return clips.reduce(
      (max, clip) =>
        Math.max(max, clip.timelineStart + clip.duration),
      0
    );
  }, [clips]);

  // 删除指定片段
  function removeClip(clipId: string) {
    setEdits((current) => {
      const sameSource =
        current.file === file &&
        current.metadata === metadata;

      return {
        file,
        metadata,
        removedClipIds: sameSource
          ? [...current.removedClipIds, clipId]
          : [clipId],
        cleared: sameSource ? current.cleared : false,
      };
    });
  }

  // 清空所有轨道
  function clearTimeline() {
    setEdits({
      file,
      metadata,
      removedClipIds: [],
      cleared: true,
    });
  }

  return {
    tracks,
    clips,
    totalDuration,
    removeClip,
    clearTimeline,
  };
}
