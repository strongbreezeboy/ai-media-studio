import { useEffect, useState } from 'react';

import type { MediaTask } from '@xinmark/media-core';
import { MediaEngine } from '@xinmark/media-engine';

export function useMediaTasks() {
  // 创建媒体引擎实例
  const [engine] = useState(
    () => new MediaEngine()
  );

  // 保存当前任务列表
  const [tasks, setTasks] = useState<MediaTask[]>([]);

  // 订阅任务列表变化
  useEffect(() => {
    const unsubscribe = engine.subscribe((nextTasks) => {
      setTasks(nextTasks);
    });

    return unsubscribe;
  }, [engine]);

  // 取消任务
  function cancelTask(taskId: string) {
    engine.cancelTask(taskId);
  }

  return {
    engine,
    tasks,
    cancelTask,
  };
}