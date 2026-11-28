
import {
  getMediaFileInfo,
} from '@xinmark/media-core';

import type {
  ReadMetadataOptions,
} from '@xinmark/media-core';

import {
  MediabunnyAdapter,
} from '../adapters/mediabunny-adapter.js';

import type {
  MediaInspectionResult,
} from './types.js';

/**
 * 媒体检查器
 *
 * 负责组合 media-core 的基础媒体识别能力，
 * 使用 Mediabunny 读取音视频元数据。
 */
export class MediaInspector {
  private readonly adapter: MediabunnyAdapter;

  constructor(adapter: MediabunnyAdapter = new MediabunnyAdapter()) {
    this.adapter = adapter;
  }

  /**
   * 检查媒体文件
   */
  async inspect(
    file: File,
    options: ReadMetadataOptions = {},
  ): Promise<MediaInspectionResult> {
    // 1. 获取文件基本信息
    const fileInfo = getMediaFileInfo(file);

    // 2. 校验媒体类型
    if (fileInfo.kind !== 'video' && fileInfo.kind !== 'audio') {
      throw new Error('暂不支持该文件类型，请上传视频或音频文件');
    }

    // 3. 使用 Mediabunny 读取媒体元数据
    const metadata = await this.adapter.readMetadata(file, options);

    // 4. 组合检查结果
    return {
      file: fileInfo,
      metadata,
    };
  }
}
