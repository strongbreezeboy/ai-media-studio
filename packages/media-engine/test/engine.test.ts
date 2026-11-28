
import {
  describe,
  it,
  expect,
  afterEach,
  vi,
} from 'vitest';

import { MediaEngine } from '../src/engine.js';
import { MediaInspector } from '../src/inspector/inspector.js';

import type {
  MediabunnyAdapter,
} from '../src/adapters/mediabunny-adapter.js';

import type {
  MediaMetadata,
} from '@xinmark/media-core';

import type {
  VideoTrimmer,
} from '../src/processors/video-trimmer.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MediaEngine', () => {
  it('应该创建媒体任务', () => {
    const engine = new MediaEngine();

    const task = engine.createTask({
      type: 'video-slice',
    });

    expect(task.id).toBeTruthy();
    expect(task.type).toBe('video-slice');
    expect(task.status).toBe('pending');
    expect(task.progress).toBe(0);
  });

  it('应该执行媒体任务并返回结果', async () => {
    const engine = new MediaEngine();

    const task = engine.createTask({
      type: 'video-slice',
    });

    const result = await engine.runTask(
      task.id,
      async ({ onProgress }) => {
        onProgress(50);

        return {
          success: true,
          message: '视频切片完成',
        };
      }
    );

    expect(result).toEqual({
      success: true,
      message: '视频切片完成',
    });

    expect(engine.getTask(task.id)?.status).toBe('completed');
  });

  it('应该监听任务状态变化', async () => {
    const engine = new MediaEngine();
    const receivedStatuses: string[] = [];

    const unsubscribe = engine.subscribe((tasks) => {
      const task = tasks.find(
        (item) => item.type === 'audio-process'
      );

      if (task) {
        receivedStatuses.push(task.status);
      }
    });

    const task = engine.createTask({
      type: 'audio-process',
    });

    await engine.runTask(task.id, async () => {
      return 'audio completed';
    });

    unsubscribe();

    expect(receivedStatuses).toContain('pending');
    expect(receivedStatuses).toContain('processing');
    expect(receivedStatuses).toContain('completed');
  });

  it('应该通过 MediaEngine 检查媒体文件', async () => {
    const metadata: MediaMetadata = {
      name: 'demo.mp4',
      size: 12,
      mimeType: 'video/mp4',
      kind: 'video',
      duration: 120,
      width: 1920,
      height: 1080,
    };

    const adapter = {
      readMetadata: vi.fn().mockResolvedValue(metadata),
    } as unknown as MediabunnyAdapter;

    const inspector = new MediaInspector(adapter);
    const engine = new MediaEngine({}, inspector);

    const file = new File(['video content'], 'demo.mp4', {
      type: 'video/mp4',
    });

    const result = await engine.inspect(file);

    expect(result.file.name).toBe('demo.mp4');
    expect(result.file.kind).toBe('video');

    expect(result.metadata.kind).toBe('video');
    expect(result.metadata.duration).toBe(120);

    expect(adapter.readMetadata).toHaveBeenCalledWith(file, {});
  });

  it('应该通过 trimVideo 创建视频裁剪任务并返回 Blob', async () => {
    const blob = new Blob(['trimmed video'], {
      type: 'video/mp4',
    });

    const videoTrimmer = {
      trim: vi.fn().mockResolvedValue(blob),
    } as unknown as VideoTrimmer;

    const engine = new MediaEngine(
      {},
      undefined,
      videoTrimmer,
    );

    const file = new File(['original video'], 'demo.mp4', {
      type: 'video/mp4',
    });

    const options = {
      start: 5,
      end: 15,
    };

    const execution = engine.trimVideo(file, options);

    // 创建任务后，初始状态应该是 pending
    expect(execution.task.type).toBe('video-trim');
    expect(execution.task.status).toBe('pending');

    // 获取裁剪结果
    const result = await execution.result;

    expect(result).toBe(blob);

    // 确认裁剪器收到了正确的参数
    expect(videoTrimmer.trim).toHaveBeenCalledWith(
      file,
      options,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        onProgress: expect.any(Function),
        onCleanup: expect.any(Function),
      }),
    );

    // 任务最终应该完成
    expect(engine.getTask(execution.task.id)?.status).toBe('completed');
  });

  it('视频裁剪任务超时时应该进入 failed', async () => {
    const videoTrimmer = {
      trim: vi.fn(
        (
          _file: File,
          _options: { start: number; end: number },
          context: { signal: AbortSignal },
        ) => {
          return new Promise<Blob>((_resolve, reject) => {
            context.signal.addEventListener(
              'abort',
              () => {
                reject(
                  new DOMException('任务已取消', 'AbortError'),
                );
              },
              { once: true },
            );
          });
        },
      ),
    } as unknown as VideoTrimmer;

    const engine = new MediaEngine({}, undefined, videoTrimmer);

    const file = new File(['original video'], 'demo.mp4', {
      type: 'video/mp4',
    });

    const execution = engine.trimVideo(
      file,
      { start: 0, end: 10 },
      { timeout: 10 },
    );

    await expect(execution.result).rejects.toMatchObject({
      name: 'TimeoutError',
    });

    expect(engine.getTask(execution.task.id)?.status).toBe('failed');
  });

  it('视频裁剪失败时任务应该进入 failed', async () => {
    const videoTrimmer = {
      trim: vi.fn().mockRejectedValue(
        new Error('视频裁剪失败'),
      ),
    } as unknown as VideoTrimmer;

    const engine = new MediaEngine(
      {},
      undefined,
      videoTrimmer,
    );

    const file = new File(['original video'], 'demo.mp4', {
      type: 'video/mp4',
    });

    const execution = engine.trimVideo(file, {
      start: 0,
      end: 10,
    });

    await expect(execution.result).rejects.toThrow('视频裁剪失败');

    expect(engine.getTask(execution.task.id)?.status).toBe('failed');
  });
});
