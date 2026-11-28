
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { useMediaTasks } from './use-media-tasks';
import { saveProject } from '@/lib/project-storage';

type MediaEngineInstance = ReturnType<typeof useMediaTasks>['engine'];

interface UseVideoTrimTaskOptions {
  engine: MediaEngineInstance;
  file: File | null;
  videoDuration: number;
  trimStart: string;
  trimEnd: string;
  setError: Dispatch<SetStateAction<string>>;
}

export function useVideoTrimTask({
  engine,
  file,
  videoDuration,
  trimStart,
  trimEnd,
  setError,
}: UseVideoTrimTaskOptions) {
  const [trimmedUrl, setTrimmedUrl] = useState('');

  useEffect(() => {
    if (!trimmedUrl) return;

    return () => URL.revokeObjectURL(trimmedUrl);
  }, [trimmedUrl]);

  async function handleCreateTask() {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('目前只支持视频裁剪');
      return;
    }

    if (trimStart.trim() === '' || trimEnd.trim() === '') {
      setError('请输入正确的裁剪起止时间');
      return;
    }

    const start = Number(trimStart);
    const end = Number(trimEnd);

    setTrimmedUrl('');
    setError('');

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end <= start
    ) {
      setError('请输入正确的裁剪起止时间');
      return;
    }

    if (end > videoDuration) {
      setError(
        `结束时间不能超过视频总时长 ${videoDuration.toFixed(2)} 秒`,
      );
      return;
    }

    try {
      const execution = engine.trimVideo(file, { start, end });
      const result = await execution.result;

      // 生成视频预览 URL
      const url = URL.createObjectURL(result);
      setTrimmedUrl(url);

      // 保存项目到 IndexedDB
      const now = Date.now();

      try {
        await saveProject({
          id: crypto.randomUUID(),
          taskId: execution.task.id,
          name: `${file.name} - 裁剪`,
          type: 'video-trim',
          sourceName: file.name,
          createdAt: now,
          updatedAt: now,
          status: 'completed',
          parameters: {
            start,
            end,
          },
          outputBlob: result,
        });
      } catch (storageError) {
        console.error('项目保存失败:', storageError);
        setError('视频裁剪成功，但项目保存失败。请检查浏览器存储空间或权限。');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '视频裁剪失败',
      );
    }
  }

  return {
    trimmedUrl,
    handleCreateTask,
  };
}
