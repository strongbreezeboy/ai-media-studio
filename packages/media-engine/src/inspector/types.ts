import { MediaFileInfo, MediaMetadata } from '@xinmark/media-core';
/**
 * 媒体检查结果
 *
 * file：文件本身的基本信息
 * metadata：媒体内容的元数据信息
 */
export interface MediaInspectionResult {
  file: MediaFileInfo;
  metadata: MediaMetadata;
}