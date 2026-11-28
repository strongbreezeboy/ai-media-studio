
import {
  describe,
  it,
  expect,
  vi,
  afterEach,
} from 'vitest';

import { MediaInspector } from '../src/inspector/inspector.js';
import type { MediabunnyAdapter } from '../src/adapters/mediabunny-adapter.js';

import type { MediaMetadata } from '@xinmark/media-core';

describe('MediaInspector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该读取视频文件信息和元数据', async () => {
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

    const file = new File(['video content'], 'demo.mp4', {
      type: 'video/mp4',
    });

    const result = await inspector.inspect(file);

    expect(result.file.name).toBe('demo.mp4');
    expect(result.file.kind).toBe('video');

    expect(result.metadata.kind).toBe('video');
    expect(result.metadata.duration).toBe(120);
    expect(result.metadata.width).toBe(1920);
    expect(result.metadata.height).toBe(1080);

    expect(adapter.readMetadata).toHaveBeenCalledWith(file, {});
  });

  it('应该读取音频文件信息和元数据', async () => {
    const metadata: MediaMetadata = {
      name: 'demo.mp3',
      size: 12,
      mimeType: 'audio/mpeg',
      kind: 'audio',
      duration: 60,
    };

    const adapter = {
      readMetadata: vi.fn().mockResolvedValue(metadata),
    } as unknown as MediabunnyAdapter;

    const inspector = new MediaInspector(adapter);

    const file = new File(['audio content'], 'demo.mp3', {
      type: 'audio/mpeg',
    });

    const result = await inspector.inspect(file);

    expect(result.file.kind).toBe('audio');
    expect(result.metadata.kind).toBe('audio');
    expect(result.metadata.duration).toBe(60);

    expect(adapter.readMetadata).toHaveBeenCalledWith(file, {});
  });

  it('不支持的文件类型应该抛出异常', async () => {
    const adapter = {
      readMetadata: vi.fn(),
    } as unknown as MediabunnyAdapter;

    const inspector = new MediaInspector(adapter);

    const file = new File(['text content'], 'demo.txt', {
      type: 'text/plain',
    });

    await expect(inspector.inspect(file)).rejects.toThrow(
      '暂不支持该文件类型',
    );

    expect(adapter.readMetadata).not.toHaveBeenCalled();
  });

  it('图片文件不应该进入音视频解析流程', async () => {
    const adapter = {
      readMetadata: vi.fn(),
    } as unknown as MediabunnyAdapter;

    const inspector = new MediaInspector(adapter);

    const file = new File(['image content'], 'demo.png', {
      type: 'image/png',
    });

    await expect(inspector.inspect(file)).rejects.toThrow(
      '暂不支持该文件类型',
    );

    expect(adapter.readMetadata).not.toHaveBeenCalled();
  });

  it('Mediabunny 解析失败时应该向上抛出异常', async () => {
    const adapter = {
      readMetadata: vi.fn().mockRejectedValue(
        new Error('媒体文件解析失败'),
      ),
    } as unknown as MediabunnyAdapter;

    const inspector = new MediaInspector(adapter);

    const file = new File(['video content'], 'demo.mp4', {
      type: 'video/mp4',
    });

    await expect(inspector.inspect(file)).rejects.toThrow(
      '媒体文件解析失败',
    );
  });
});
