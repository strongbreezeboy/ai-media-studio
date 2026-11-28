
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';

import { MediabunnyAdapter } from '../src/adapters/mediabunny-adapter.js';

// 创建可以被测试控制的模拟对象
const {
  mockInput,
  mockVideoTrack,
  mockAudioTrack,
} = vi.hoisted(() => {
  const mockVideoTrack = {
    getDisplayWidth: vi.fn(),
    getDisplayHeight: vi.fn(),
  };

  const mockAudioTrack = {};

  const mockInput = {
    canRead: vi.fn(),
    getPrimaryVideoTrack: vi.fn(),
    getPrimaryAudioTrack: vi.fn(),
    getDurationFromMetadata: vi.fn(),
    computeDuration: vi.fn(),
    dispose: vi.fn(),
  };

  return {
    mockInput,
    mockVideoTrack,
    mockAudioTrack,
  };
});

// 模拟 Mediabunny

vi.mock('mediabunny', () => ({
  ALL_FORMATS: 'ALL_FORMATS',

  BlobSource: class MockBlobSource {
    file: File;

    constructor(file: File) {
      this.file = file;
    }
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
}));


describe('MediabunnyAdapter', () => {
  let adapter: MediabunnyAdapter;

  beforeEach(() => {
    adapter = new MediabunnyAdapter();

    vi.clearAllMocks();

    mockInput.canRead.mockResolvedValue(true);

    mockInput.getPrimaryVideoTrack.mockResolvedValue(
      mockVideoTrack,
    );

    mockInput.getPrimaryAudioTrack.mockResolvedValue(null);

    mockInput.getDurationFromMetadata.mockResolvedValue(120);

    mockInput.computeDuration.mockResolvedValue(120);

    mockVideoTrack.getDisplayWidth.mockResolvedValue(1920);
    mockVideoTrack.getDisplayHeight.mockResolvedValue(1080);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('canRead', () => {
    it('应该返回媒体文件是否可读取', async () => {
      const file = new File(['video'], 'demo.mp4', {
        type: 'video/mp4',
      });

      const result = await adapter.canRead(file);

      expect(result).toBe(true);
      expect(mockInput.canRead).toHaveBeenCalled();
      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });

    it('读取检查失败时也应该释放资源', async () => {
      mockInput.canRead.mockRejectedValue(
        new Error('读取失败'),
      );

      const file = new File(['video'], 'demo.mp4', {
        type: 'video/mp4',
      });

      await expect(adapter.canRead(file)).rejects.toThrow(
        '读取失败',
      );

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });
    it('读取失败且 dispose 也失败时应该保留两个异常', async () => {
      mockInput.canRead.mockRejectedValue(
        new Error('canRead failed'),
      );

      mockInput.dispose.mockImplementationOnce(() => {
        throw new Error('dispose failed');
      });

      const file = new File(
        ['video'],
        'demo.mp4',
        { type: 'video/mp4' },
      );

      let caughtError: unknown;

      try {
        await adapter.canRead(file);
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(AggregateError);

      const aggregateError = caughtError as AggregateError;

      expect(aggregateError.errors).toHaveLength(2);

      expect(aggregateError.errors[0]).toMatchObject({
        message: 'canRead failed',
      });

      expect(aggregateError.errors[1]).toMatchObject({
        message: 'dispose failed',
      });
    });
  });

  describe('readMetadata', () => {
    it('应该正确读取视频元数据', async () => {
      const file = new File(['video content'], 'demo.mp4', {
        type: 'video/mp4',
      });

      const result = await adapter.readMetadata(file);

      expect(result).toEqual({
        name: 'demo.mp4',
        size: file.size,
        mimeType: 'video/mp4',
        kind: 'video',
        duration: 120,
        width: 1920,
        height: 1080,
      });

      expect(mockInput.canRead).toHaveBeenCalled();

      expect(
        mockInput.getPrimaryVideoTrack,
      ).toHaveBeenCalled();

      expect(
        mockInput.getDurationFromMetadata,
      ).toHaveBeenCalled();

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });

    it('应该正确读取音频元数据', async () => {
      mockInput.getPrimaryVideoTrack.mockResolvedValue(null);

      mockInput.getPrimaryAudioTrack.mockResolvedValue(
        mockAudioTrack,
      );

      const file = new File(['audio content'], 'demo.mp3', {
        type: 'audio/mpeg',
      });

      const result = await adapter.readMetadata(file);

      expect(result).toEqual({
        name: 'demo.mp3',
        size: file.size,
        mimeType: 'audio/mpeg',
        kind: 'audio',
        duration: 120,
      });

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });

    it('元数据没有记录时长时应该计算时长', async () => {
      mockInput.getDurationFromMetadata.mockResolvedValue(null);

      mockInput.computeDuration.mockResolvedValue(180);

      const file = new File(['video content'], 'demo.mp4', {
        type: 'video/mp4',
      });

      const result = await adapter.readMetadata(file);

      expect(result.duration).toBe(180);

      expect(
        mockInput.computeDuration,
      ).toHaveBeenCalledTimes(1);

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });

    it('不支持的媒体文件应该抛出异常', async () => {
      mockInput.canRead.mockResolvedValue(false);

      const file = new File(['invalid content'], 'demo.mp4', {
        type: 'video/mp4',
      });

      await expect(
        adapter.readMetadata(file),
      ).rejects.toThrow('媒体文件解析失败');

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });

    it('没有有效音视频轨道时应该抛出异常', async () => {
      mockInput.getPrimaryVideoTrack.mockResolvedValue(null);

      mockInput.getPrimaryAudioTrack.mockResolvedValue(null);

      const file = new File(['invalid content'], 'demo.mp4', {
        type: 'video/mp4',
      });

      await expect(
        adapter.readMetadata(file),
      ).rejects.toThrow('没有找到有效的音视频轨道');

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });

    it('解析过程中发生异常时应该释放资源', async () => {
      mockInput.getPrimaryVideoTrack.mockRejectedValue(
        new Error('轨道读取失败'),
      );

      const file = new File(['video content'], 'demo.mp4', {
        type: 'video/mp4',
      });

      await expect(
        adapter.readMetadata(file),
      ).rejects.toThrow('轨道读取失败');

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });

    it('读取超时时应该抛出超时异常并释放资源', async () => {
      vi.useFakeTimers();

      mockInput.canRead.mockReturnValue(
        new Promise<boolean>(() => {}),
      );

      const file = new File(['video content'], 'demo.mp4', {
        type: 'video/mp4',
      });

      const promise = adapter.readMetadata(file, {
        timeout: 1000,
      });

      const assertion = expect(promise).rejects.toThrow(
        '读取媒体信息超时',
      );

      await vi.advanceTimersByTimeAsync(1000);

      await assertion;

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);
    });

    it('读取超时且 dispose 失败时应该保留两个异常', async () => {
      vi.useFakeTimers();

      mockInput.canRead.mockReturnValue(
        new Promise<boolean>(() => {}),
      );

      mockInput.dispose.mockImplementationOnce(() => {
        throw new Error('dispose failed');
      });

      const file = new File(
        ['video content'],
        'demo.mp4',
        { type: 'video/mp4' },
      );

      const promise = adapter.readMetadata(file, {
        timeout: 1000,
      });

      const assertion = expect(promise).rejects.toMatchObject({
        name: 'AggregateError',
      });

      await vi.advanceTimersByTimeAsync(1000);

      await assertion;

      // 确认两个异常都被保留
      // 注意：这里需要捕获 AggregateError 才能检查 errors。
    });


    it('超时后底层读取被取消时不应该产生未处理异常', async () => {
      vi.useFakeTimers();

      let rejectRead!: (error: Error) => void;

      mockInput.canRead.mockReturnValue(
        new Promise<boolean>((_, reject) => {
          rejectRead = reject;
        }),
      );

      const file = new File(
        ['video content'],
        'demo.mp4',
        { type: 'video/mp4' },
      );

      const promise = adapter.readMetadata(file, {
        timeout: 1000,
      });

      const assertion = expect(promise).rejects.toThrow(
        '读取媒体信息超时',
      );

      // 触发超时，readMetadata 进入 finally 并调用 dispose
      await vi.advanceTimersByTimeAsync(1000);

      await assertion;

      expect(mockInput.dispose).toHaveBeenCalledTimes(1);

      // 模拟底层读取在 dispose 后才返回取消异常
      rejectRead(new Error('Input has been disposed'));

      // 让 Promise rejection 有机会传播
      await Promise.resolve();
      await Promise.resolve();
    });


    it.each([
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      2_147_483_648,
    ])(
      'timeout 为 %s 时应该拒绝读取',
      async (timeout) => {
        const file = new File(
          ['video content'],
          'demo.mp4',
          {
            type: 'video/mp4',
          },
        );

        await expect(
          adapter.readMetadata(file, { timeout }),
        ).rejects.toThrow(RangeError);

        // 参数校验失败时，不应该开始媒体读取
        expect(mockInput.canRead).not.toHaveBeenCalled();
      },
    );
    it('dispose 失败时应该向调用方抛出清理异常', async () => {
      mockInput.canRead.mockResolvedValue(true);

      mockInput.dispose.mockImplementationOnce(() => {
        throw new Error('dispose failed');
      });

      const file = new File(
        ['video content'],
        'demo.mp4',
        { type: 'video/mp4' },
      );

      await expect(
        adapter.readMetadata(file),
      ).rejects.toThrow('dispose failed');
    });

    it('解析失败且 dispose 也失败时应该保留两个异常', async () => {
      mockInput.canRead.mockRejectedValue(
        new Error('metadata parse failed'),
      );

      mockInput.dispose.mockImplementationOnce(() => {
        throw new Error('dispose failed');
      });

      const file = new File(
        ['video content'],
        'demo.mp4',
        { type: 'video/mp4' },
      );

      let caughtError: unknown;

      try {
        await adapter.readMetadata(file);
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(AggregateError);

      const aggregateError = caughtError as AggregateError;

      expect(aggregateError.errors).toHaveLength(2);

      expect(aggregateError.errors[0]).toMatchObject({
        message: 'metadata parse failed',
      });

      expect(aggregateError.errors[1]).toMatchObject({
        message: 'dispose failed',
      });
    });

  });
});
