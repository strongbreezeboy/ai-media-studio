import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
} from 'mediabunny';

import type {
  TaskExecutorContext,
} from '@xinmark/media-core';

/**
 * 视频裁剪参数
 *
 * start 和 end 的单位都是秒。
 */
export interface VideoTrimOptions {
  start: number;
  end: number;
}

/**
 * 视频裁剪器
 *
 * 使用 Mediabunny 完成视频裁剪和 MP4 封装，
 * 通过 media-core 的任务上下文管理进度、取消和资源清理。
 */
export class VideoTrimmer {
  async trim(
    file: File,
    options: VideoTrimOptions,
    context: TaskExecutorContext,
  ): Promise<Blob> {
    const { start, end } = options;
    const { signal, onProgress, onCleanup } = context;

    // 统一检查任务是否已经取消
    const throwIfAborted = () => {
      if (signal.aborted) {
        throw new DOMException('任务已取消', 'AbortError');
      }
    };


    // 校验裁剪参数
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new TypeError('裁剪时间必须是有限数值');
    }

    if (start < 0) {
      throw new RangeError('裁剪开始时间不能小于 0');
    }

    if (end <= start) {
      throw new RangeError('裁剪结束时间必须大于开始时间');
    }

    throwIfAborted();

    // 创建输入
    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    });

    // 输入资源由任务管理器在执行器结束后清理
    onCleanup(() => input.dispose());

    // 检查媒体文件是否可读取
    const readable = await input.canRead();
    throwIfAborted();

    if (!readable) {
      throw new Error('无法读取该媒体文件');
    }

    // 获取音视频轨道
    const videoTrack = await input.getPrimaryVideoTrack();
    throwIfAborted();

    const audioTrack = await input.getPrimaryAudioTrack();
    throwIfAborted();

    if (!videoTrack) {
      throw new Error('没有找到视频轨道');
    }

    const tracks = [videoTrack, audioTrack].filter(
      (track) => track !== null,
    );

    // 获取媒体时长
    let duration = await input.getDurationFromMetadata(tracks);
    throwIfAborted();

    if (duration === null) {
      duration = await input.computeDuration(tracks);
      throwIfAborted();
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('无法获取有效的视频时长');
    }

    if (end > duration) {
      throw new RangeError(
        `裁剪结束时间不能超过视频时长（${duration} 秒）`,
      );
    }

    // 创建输出
    const target = new BufferTarget();

    const output = new Output({
      format: new Mp4OutputFormat(),
      target,
    });


    onCleanup(async () => {
      if (
        output.state !== 'finalized' &&
        output.state !== 'canceled'
      ) {
        await output.cancel();
      }
    });

    const conversion = await Conversion.init({
      input,
      output,
      trim: {
        start,
        end,
      },
    });

    // 统一管理转换取消，避免重复调用
    let cancelPromise: Promise<void> | undefined;

    const cancelConversion = (): Promise<void> => {
      if (!cancelPromise) {
        try {
          // 立即发起取消，不推迟到微任务
          cancelPromise = conversion.cancel();
        } catch (error) {
          // 将同步异常转换为 rejected Promise
          cancelPromise = Promise.reject(error);
        }
      }

      return cancelPromise;
    };


    // 将 Mediabunny 的取消能力连接到 AbortSignal
    const handleAbort = () => {
      void cancelConversion().catch(() => {
        // 取消异常不在事件监听器中抛出。
        // 最终由转换执行结果和任务管理器处理。
      });
    };

    const removeAbortListener = () => {
      signal.removeEventListener('abort', handleAbort);
    };

    signal.addEventListener('abort', handleAbort, {
      once: true,
    });

    // 注册兜底清理，防止异常路径遗留监听器
    onCleanup(removeAbortListener);

    // 处理注册监听器前后发生取消的情况
    if (signal.aborted) {
      await cancelConversion();
      throwIfAborted();
    }

    // 接收转换进度
    conversion.onProgress = (progress) => {
      if (!Number.isFinite(progress)) {
        return;
      }
      const normalizedProgress = Math.max(
        0,
        Math.min(100, progress * 100),
      );

      onProgress(normalizedProgress);
    };

    // 执行转换
    try {
      await conversion.execute();
    } finally {
      // 转换结束后立即移除监听器
      removeAbortListener();
    }

    throwIfAborted();

    // 获取最终文件
    const buffer = target.buffer;

    if (!buffer) {
      throw new Error('视频裁剪完成，但没有生成输出文件');
    }

    const mimeType = await output.getMimeType();

    throwIfAborted();

    return new Blob([buffer], {
      type: mimeType,
    });
  }
}
