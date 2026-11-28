
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest';

import { VideoTrimmer } from '../src/processors/video-trimmer.js';

// 创建可以被测试控制的模拟对象
const {
  mockInput,
  mockTarget,
  mockOutput,
  mockConversion,
} = vi.hoisted(() => {
  const mockInput = {
    canRead: vi.fn(),
    getPrimaryVideoTrack: vi.fn(),
    getPrimaryAudioTrack: vi.fn(),
    getDurationFromMetadata: vi.fn(),
    computeDuration: vi.fn(),
    dispose: vi.fn(),
  };

  const mockTarget = {
    buffer: new Uint8Array([1, 2, 3]).buffer as ArrayBuffer | null,
  };

  const mockOutput = {
    state: 'started' as
      | 'pending'
      | 'started'
      | 'canceled'
      | 'finalizing'
      | 'finalized',
    getMimeType: vi.fn(),
    cancel: vi.fn(),
  };

  const mockConversion = {
    init: vi.fn(),
    execute: vi.fn(),
    cancel: vi.fn(),
    onProgress: null as
      | ((progress: number, processedTime: number) => unknown)
      | null,
  };

  return {
    mockInput,
    mockTarget,
    mockOutput,
    mockConversion,
  };
});

// 模拟 Mediabunny
vi.mock('mediabunny', () => ({
  ALL_FORMATS: 'ALL_FORMATS',

  BlobSource: class MockBlobSource {
    constructor(_file: File) {}
  },

  Input: class MockInput {
    canRead = mockInput.canRead;

    getPrimaryVideoTrack = mockInput.getPrimaryVideoTrack;

    getPrimaryAudioTrack = mockInput.getPrimaryAudioTrack;

    getDurationFromMetadata = mockInput.getDurationFromMetadata;

    computeDuration = mockInput.computeDuration;

    dispose = mockInput.dispose;

    constructor(_options: unknown) {}
  },

  BufferTarget: class MockBufferTarget {
    constructor() {
      return mockTarget;
    }
  },

  Mp4OutputFormat: class MockMp4OutputFormat {},

  Output: class MockOutput {
    get state() {
      return mockOutput.state;
    }

    getMimeType = mockOutput.getMimeType;

    cancel = mockOutput.cancel;

    constructor(_options: unknown) {}
  },

  Conversion: class MockConversion {
    static init = mockConversion.init;
  },
}));

// 创建任务上下文，并收集清理函数
function createContext(signal = new AbortController().signal) {
  const cleanups: Array<() => void | Promise<void>> = [];

  const context = {
    signal,
    onProgress: vi.fn(),
    onCleanup: vi.fn(
      (cleanup: () => void | Promise<void>) => {
        cleanups.push(cleanup);
      },
    ),
  };

  return {
    context,
    cleanups,
  };
}

// 模拟 MediaTaskManager 的逆序清理行为
async function runCleanups(
  cleanups: Array<() => void | Promise<void>>,
) {
  for (const cleanup of [...cleanups].reverse()) {
    await cleanup();
  }
}

function createVideoFile() {
  return new File(
    ['video content'],
    'demo.mp4',
    { type: 'video/mp4' },
  );
}

describe('VideoTrimmer', () => {
  let trimmer: VideoTrimmer;

  beforeEach(() => {
    vi.clearAllMocks();

    trimmer = new VideoTrimmer();

    mockTarget.buffer = new Uint8Array([1, 2, 3]).buffer;

    mockOutput.state = 'started';

    // 输入资源默认行为
    mockInput.dispose.mockResolvedValue(undefined);
    mockInput.canRead.mockResolvedValue(true);
    mockInput.getPrimaryVideoTrack.mockResolvedValue({});
    mockInput.getPrimaryAudioTrack.mockResolvedValue(null);
    mockInput.getDurationFromMetadata.mockResolvedValue(120);
    mockInput.computeDuration.mockResolvedValue(120);

    // 输出资源默认行为
    mockOutput.getMimeType.mockResolvedValue('video/mp4');

    mockOutput.cancel.mockImplementation(async () => {
      mockOutput.state = 'canceled';
    });

    // 转换任务默认行为
    mockConversion.onProgress = null;

    mockConversion.init.mockResolvedValue(mockConversion);

    mockConversion.execute.mockImplementation(async () => {
      mockConversion.onProgress?.(0.5, 5);
      mockOutput.state = 'finalized';
    });

    mockConversion.cancel.mockResolvedValue(undefined);
  });

  describe('参数校验', () => {
    it.each([
      [NaN, 10],
      [0, Infinity],
      [-1, 10],
      [10, 5],
      [5, 5],
    ])(
      '非法裁剪时间 start=%s, end=%s 时应该抛出异常',
      async (start, end) => {
        const { context } = createContext();

        await expect(
          trimmer.trim(
            createVideoFile(),
            { start, end },
            context,
          ),
        ).rejects.toThrow();

        // 参数校验失败时，不应该创建转换任务
        expect(mockConversion.init).not.toHaveBeenCalled();
      },
    );
  });

  describe('正常裁剪', () => {
    it('应该生成 MP4 Blob', async () => {
      const { context, cleanups } = createContext();

      const result = await trimmer.trim(
        createVideoFile(),
        {
          start: 2,
          end: 8,
        },
        context,
      );

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('video/mp4');

      expect(mockConversion.init).toHaveBeenCalledWith(
        expect.objectContaining({
          trim: {
            start: 2,
            end: 8,
          },
        }),
      );

      expect(mockConversion.execute).toHaveBeenCalledTimes(1);

      await runCleanups(cleanups);

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);

      // 成功完成的输出不应该再次 cancel
      expect(mockOutput.cancel).not.toHaveBeenCalled();
    });

    it('应该正确报告转换进度', async () => {
      const { context, cleanups } = createContext();

      await trimmer.trim(
        createVideoFile(),
        {
          start: 0,
          end: 10,
        },
        context,
      );

      expect(context.onProgress).toHaveBeenCalledWith(50);

      await runCleanups(cleanups);
    });

    it('输出 Buffer 为空时应该抛出异常', async () => {
      mockTarget.buffer = null;
      const { context, cleanups } = createContext();

      await expect(
        trimmer.trim(
          createVideoFile(),
          {
            start: 0,
            end: 10,
          },
          context,
        ),
      ).rejects.toThrow('没有生成输出文件');

      await runCleanups(cleanups);

      expect(mockOutput.cancel).not.toHaveBeenCalled();
      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });

    it('裁剪结束时间等于视频时长时应该允许裁剪', async () => {
      const { context, cleanups } = createContext();

      const result = await trimmer.trim(
        createVideoFile(),
        { start: 0, end: 120 },
        context,
      );

      expect(result).toBeInstanceOf(Blob);

      await runCleanups(cleanups);
    });

    it('裁剪结束时间超过视频时长时应该抛出 RangeError', async () => {
      const { context, cleanups } = createContext();

      await expect(
        trimmer.trim(
          createVideoFile(),
          { start: 0, end: 121 },
          context,
        ),
      ).rejects.toThrow(RangeError);

      await runCleanups(cleanups);

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
      expect(mockConversion.init).not.toHaveBeenCalled();
    });

    it('无法从元数据获取时长时应该回退到计算时长', async () => {
      const { context, cleanups } = createContext();

      mockInput.getDurationFromMetadata.mockResolvedValue(null);
      mockInput.computeDuration.mockResolvedValue(90);

      const result = await trimmer.trim(
        createVideoFile(),
        { start: 0, end: 90 },
        context,
      );

      expect(result).toBeInstanceOf(Blob);
      expect(mockInput.computeDuration).toHaveBeenCalled();

      await runCleanups(cleanups);
    });

    it('计算得到无效时长时应该抛出异常', async () => {
      const { context, cleanups } = createContext();

      mockInput.getDurationFromMetadata.mockResolvedValue(null);
      mockInput.computeDuration.mockResolvedValue(0);

      await expect(
        trimmer.trim(
          createVideoFile(),
          { start: 0, end: 10 },
          context,
        ),
      ).rejects.toThrow('无法获取有效的视频时长');

      await runCleanups(cleanups);

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
      expect(mockConversion.init).not.toHaveBeenCalled();
    });

    it('应该过滤非法进度并限制进度范围', async () => {
      const { context, cleanups } = createContext();

      await trimmer.trim(
        createVideoFile(),
        {
          start: 0,
          end: 10,
        },
        context,
      );

      // 清除 execute 默认模拟行为产生的 50% 进度
      context.onProgress.mockClear();

      // 模拟 Mediabunny 返回不同的进度值
      mockConversion.onProgress?.(NaN, 1);
      mockConversion.onProgress?.(Infinity, 2);
      mockConversion.onProgress?.(-0.5, 3);
      mockConversion.onProgress?.(0.5, 4);
      mockConversion.onProgress?.(1.5, 5);

      // NaN 和 Infinity 应该被忽略
      // 其他值应该限制在 0～100
      expect(context.onProgress).toHaveBeenCalledTimes(3);

      expect(context.onProgress).toHaveBeenNthCalledWith(1, 0);
      expect(context.onProgress).toHaveBeenNthCalledWith(2, 50);
      expect(context.onProgress).toHaveBeenNthCalledWith(3, 100);

      await runCleanups(cleanups);
    });
  });

  describe('异常处理和资源清理', () => {
    it('转换失败时应该释放输入和输出资源', async () => {
      mockConversion.execute.mockRejectedValue(
        new Error('conversion failed'),
      );

      const { context, cleanups } = createContext();

      await expect(
        trimmer.trim(
          createVideoFile(),
          {
            start: 0,
            end: 10,
          },
          context,
        ),
      ).rejects.toThrow('conversion failed');

      await runCleanups(cleanups);

      expect(mockOutput.cancel).toHaveBeenCalledTimes(1);
      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });

    it('初始化转换失败时也应该释放资源', async () => {
      mockConversion.init.mockRejectedValue(
        new Error('init failed'),
      );

      const { context, cleanups } = createContext();

      await expect(
        trimmer.trim(
          createVideoFile(),
          {
            start: 0,
            end: 10,
          },
          context,
        ),
      ).rejects.toThrow('init failed');

      await runCleanups(cleanups);

      expect(mockOutput.cancel).toHaveBeenCalledTimes(1);
      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('任务取消', () => {
    it('收到 AbortSignal 时应该调用 Conversion.cancel', async () => {
      const controller = new AbortController();

      const { context, cleanups } = createContext(
        controller.signal,
      );

      let rejectExecute!: (error: Error) => void;

      mockConversion.execute.mockImplementation(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectExecute = reject;
          }),
      );

      const trimPromise = trimmer.trim(
        createVideoFile(),
        {
          start: 0,
          end: 10,
        },
        context,
      );

      // 等待 Conversion.execute 开始执行
      await vi.waitFor(() => {
        expect(mockConversion.execute).toHaveBeenCalled();
      });

      controller.abort();

      expect(mockConversion.cancel).toHaveBeenCalledTimes(1);

      // 模拟 Mediabunny 响应取消并结束转换
      rejectExecute(new Error('conversion canceled'));

      await expect(trimPromise).rejects.toThrow(
        'conversion canceled',
      );

      await runCleanups(cleanups);

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
      expect(mockOutput.cancel).toHaveBeenCalledTimes(1);
    });
    it('Conversion.init 执行期间收到取消信号时应该取消转换', async () => {
      const controller = new AbortController();

      const { context, cleanups } = createContext(
        controller.signal,
      );

      let resolveInit!: (value: typeof mockConversion) => void;

      mockConversion.init.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveInit = resolve;
          }),
      );

      const trimPromise = trimmer.trim(
        createVideoFile(),
        {
          start: 0,
          end: 10,
        },
        context,
      );

      // 等待 Conversion.init 开始
      await vi.waitFor(() => {
        expect(mockConversion.init).toHaveBeenCalled();
      });

      // 初始化期间取消任务
      controller.abort();

      // 模拟 Conversion.init 完成
      resolveInit(mockConversion);

      await expect(trimPromise).rejects.toThrow('任务已取消');

      expect(mockConversion.cancel).toHaveBeenCalledTimes(1);

      await runCleanups(cleanups);

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });
    it('转换完成后再取消任务不应该再次取消转换', async () => {
      const controller = new AbortController();

      const { context, cleanups } = createContext(
        controller.signal,
      );

      // 先正常完成转换
      const result = await trimmer.trim(
        createVideoFile(),
        {
          start: 0,
          end: 10,
        },
        context,
      );

      expect(result).toBeInstanceOf(Blob);

      // 确认转换已经完成
      expect(mockConversion.execute).toHaveBeenCalledTimes(1);

      // 转换完成后再触发取消
      controller.abort();

      // 不应该再次调用 Conversion.cancel
      expect(mockConversion.cancel).not.toHaveBeenCalled();

      await runCleanups(cleanups);

      // 已完成的输出不应该被取消
      expect(mockOutput.cancel).not.toHaveBeenCalled();

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });
    it('取消操作同步抛错时不应该重复调用 Conversion.cancel', async () => {
      const controller = new AbortController();

      const { context, cleanups } = createContext(
        controller.signal,
      );

      let rejectExecute!: (error: Error) => void;

      // 模拟一个正在执行、等待外部结束的转换
      mockConversion.execute.mockImplementation(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectExecute = reject;
          }),
      );

      // 模拟底层取消方法同步抛错
      mockConversion.cancel.mockImplementation(() => {
        throw new Error('同步取消失败');
      });

      const trimPromise = trimmer.trim(
        createVideoFile(),
        { start: 0, end: 10 },
        context,
      );

      await vi.waitFor(() => {
        expect(mockConversion.execute).toHaveBeenCalled();
      });

      // 触发取消
      controller.abort();

      // 取消方法应该立即调用一次
      expect(mockConversion.cancel).toHaveBeenCalledTimes(1);

      // 模拟底层转换最终结束
      rejectExecute(new Error('转换执行结束'));

      await expect(trimPromise).rejects.toThrow();

      await runCleanups(cleanups);

      // 不应该重复调用取消方法
      expect(mockConversion.cancel).toHaveBeenCalledTimes(1);

      // 输入资源应该正常释放
      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('媒体轨道校验', () => {
    it('没有视频轨道和音频轨道时应该拒绝裁剪', async () => {
      const { context, cleanups } = createContext();

      mockInput.getPrimaryVideoTrack.mockResolvedValue(null);
      mockInput.getPrimaryAudioTrack.mockResolvedValue(null);

      await expect(
        trimmer.trim(
          createVideoFile(),
          { start: 0, end: 10 },
          context,
        ),
      ).rejects.toThrow('没有找到视频轨道');

      await runCleanups(cleanups);

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
      expect(mockConversion.init).not.toHaveBeenCalled();
    });

    it('只有音频轨道时应该拒绝视频裁剪', async () => {
      const { context, cleanups } = createContext();

      mockInput.getPrimaryVideoTrack.mockResolvedValue(null);
      mockInput.getPrimaryAudioTrack.mockResolvedValue({});

      await expect(
        trimmer.trim(
          createVideoFile(),
          { start: 0, end: 10 },
          context,
        ),
      ).rejects.toThrow('没有找到视频轨道');

      await runCleanups(cleanups);

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
      expect(mockConversion.init).not.toHaveBeenCalled();
    });
  });
});
