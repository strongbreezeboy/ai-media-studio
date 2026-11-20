/**
 * 媒体类型
 */
export type MediaKind = 'video' | 'audio' | 'image' | 'unknown';

/**
 * 媒体文件信息
 */
export interface MediaFileInfo {
  name: string;
  size: number;
  type: string;
  kind: MediaKind;
}

/**
 * 根据 MIME 类型识别媒体类型
 * 识别视频、音频、图片
 */
export function getMediaKind(file: File): MediaKind {
  const { type } = file;

  if (type.startsWith('video/')) {
    return 'video';
  }

  if (type.startsWith('audio/')) {
    return 'audio';
  }

  if (type.startsWith('image/')) {
    return 'image';
  }

  return 'unknown';
}

/**
 * 获取媒体文件基本信息
 */
export function getMediaFileInfo(file: File): MediaFileInfo {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    kind: getMediaKind(file)
  };
}

export { readMediaMetadata } from './metadata';

export type {
  MediaMetadata,
  ReadMetadataOptions,
} from './metadata';

export {
  MediaTaskManager,
} from './task-manager';

export type {
  MediaTask,
  MediaTaskStatus,
  CreateTaskOptions,
  MediaTaskManagerOptions,
  TaskExecutorContext,
  TaskExecutor,
  TaskCleanup,
} from './task-manager';