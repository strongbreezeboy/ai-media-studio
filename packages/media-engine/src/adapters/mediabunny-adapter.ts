import {
  ALL_FORMATS, // 启用 Mediabunny 支持的输入格式
  BlobSource, // 将浏览器 File 作为媒体输入源
  Input // 创建媒体读取对象
} from "mediabunny";

import type {
  MediaMetadata,
  ReadMetadataOptions,
} from '@xinmark/media-core';

const DEFAULT_TIMEOUT = 15_000;

const MAX_TIMEOUT = 2_147_483_647;

/**
 * 校验并获取读取超时时间
 */
function resolveTimeout(timeout?: number): number {
  const value = timeout ?? DEFAULT_TIMEOUT;

  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    value > MAX_TIMEOUT
  ) {
    throw new RangeError(
      `timeout 必须是大于 0 且不超过 ${MAX_TIMEOUT} 的有限数值`,
    );
  }

  return value;
}

/**
 * Mediabunny 适配器
 *
 * 统一封装第三方媒体库的调用。
 * 业务层不直接依赖 Mediabunny API。
 */
export class MediabunnyAdapter {
  /**
   * 创建媒体输入对象
   */
  private createInput(file: File): Input {
    return new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    });
  }

  /**
   * 检查媒体文件是否可以被 Mediabunny 读取
   */

  async canRead(file: File): Promise<boolean> {
    const input = this.createInput(file);

    let result = false;

    let operationError: unknown;
    let hasOperationError = false;

    let cleanupError: unknown;
    let hasCleanupError = false;

    try {
      result = await input.canRead();
    } catch (error) {
      operationError = error;
      hasOperationError = true;
    } finally {
      try {
        input.dispose();
      } catch (error) {
        cleanupError = error;
        hasCleanupError = true;
      }
    }

    if (hasOperationError && hasCleanupError) {
      throw new AggregateError(
        [operationError, cleanupError],
        '媒体文件检查失败，且资源清理也失败',
      );
    }

    if (hasOperationError) {
      throw operationError;
    }

    if (hasCleanupError) {
      throw cleanupError;
    }

    return result;
  }


  /**
   * 读取媒体元数据
   */
  async readMetadata(
    file: File,
    options: ReadMetadataOptions = {},
  ): Promise<MediaMetadata> {
    const timeout = resolveTimeout(options.timeout);
    const input = this.createInput(file);

    let timer: ReturnType<typeof setTimeout> | undefined;

    let metadata: MediaMetadata | undefined;

    let operationError: unknown;
    let hasOperationError = false;

    let cleanupError: unknown;
    let hasCleanupError = false;

    try {
      const readPromise = (async (): Promise<MediaMetadata> => {
        const readable = await input.canRead();

        if (!readable) {
          throw new Error('媒体文件解析失败');
        }

        const videoTrack = await input.getPrimaryVideoTrack();
        const audioTrack = await input.getPrimaryAudioTrack();

        if (!videoTrack && !audioTrack) {
          throw new Error('没有找到有效的音视频轨道');
        }

        const tracks = [videoTrack, audioTrack].filter(
          (track) => track !== null,
        );

        let duration = await input.getDurationFromMetadata(tracks);

        if (duration === null) {
          duration = await input.computeDuration(tracks);
        }

        const result: MediaMetadata = {
          name: file.name,
          size: file.size,
          mimeType: file.type,
          kind: videoTrack ? 'video' : 'audio',
          duration,
        };

        if (videoTrack) {
          result.width = await videoTrack.getDisplayWidth();
          result.height = await videoTrack.getDisplayHeight();
        }

        return result;
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('读取媒体信息超时'));
        }, timeout);
      });

      metadata = await Promise.race([
        readPromise,
        timeoutPromise,
      ]);
    } catch (error) {
      operationError = error;
      hasOperationError = true;
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }

      try {
        input.dispose();
      } catch (error) {
        cleanupError = error;
        hasCleanupError = true;
      }
    }

    // 解析和资源清理都失败：保留两个错误
    if (hasOperationError && hasCleanupError) {
      throw new AggregateError(
        [operationError, cleanupError],
        '媒体信息读取失败，且资源清理也失败',
      );
    }

    // 只有解析失败
    if (hasOperationError) {
      throw operationError;
    }

    // 只有清理失败
    if (hasCleanupError) {
      throw cleanupError;
    }

    return metadata!;

  }
}