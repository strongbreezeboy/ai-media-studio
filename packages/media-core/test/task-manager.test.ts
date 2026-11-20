import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  MediaTaskManager,
} from '../src/task-manager';

describe('MediaTaskManager', () => {
  let manager: MediaTaskManager;

  beforeEach(() => {
    manager = new MediaTaskManager();
  });

  describe('任务创建', () => {
    it('应该创建一个初始状态为 pending 的任务', () => {
      const task = manager.create({
        type: 'video-slice',
      });

      expect(task.id).toBeTruthy();
      expect(task.type).toBe('video-slice');
      expect(task.status).toBe('pending');
      expect(task.progress).toBe(0);
    });

    it('应该能够获取全部任务', () => {
      manager.create({ type: 'video-slice' });
      manager.create({ type: 'audio-extract' });

      expect(manager.getAll()).toHaveLength(2);
    });

    it('应该能够根据 ID 查询任务', () => {
      const task = manager.create({
        type: 'video-slice',
      });

      expect(manager.get(task.id)).toEqual(task);
    });
  });


  describe('任务状态更新', () => {
    it('任务失败时应该保存错误信息', async () => {
      const task = manager.create({
        type: 'video-slice',
      });

      const runPromise = manager.run(task.id, async () => {
        throw new Error('视频编码格式不受支持');
      });

      await expect(runPromise).rejects.toThrow(
        '视频编码格式不受支持'
      );

      const result = manager.get(task.id);

      expect(result?.status).toBe('failed');
      expect(result?.error).toBe('视频编码格式不受支持');
    });

    it('应该允许任务从 pending 进入 processing', async () => {
      const task = manager.create({
        type: 'video-slice',
      });

      let release!: () => void;

      const blocker = new Promise<void>((resolve) => {
        release = resolve;
      });

      let notifyStarted!: () => void;

      const started = new Promise<void>((resolve) => {
        notifyStarted = resolve;
      });

      const runPromise = manager.run(task.id, async () => {
        notifyStarted();
        await blocker;
        return '处理完成';
      });

      await started;

      expect(manager.get(task.id)?.status).toBe('processing');

      release();
      await runPromise;
    });

    it('应该能够更新任务进度', async () => {
      const task = manager.create({
        type: 'video-slice',
      });

      let release!: () => void;

      const blocker = new Promise<void>((resolve) => {
        release = resolve;
      });

      let notifyProgress!: () => void;

      const progressUpdated = new Promise<void>((resolve) => {
        notifyProgress = resolve;
      });

      const runPromise = manager.run(
        task.id,
        async ({ onProgress }) => {
          onProgress(50);
          notifyProgress();

          await blocker;

          return '处理完成';
        }
      );

      await progressUpdated;

      expect(manager.get(task.id)?.status).toBe('processing');
      expect(manager.get(task.id)?.progress).toBe(50);

      release();
      await runPromise;

      expect(manager.get(task.id)?.status).toBe('completed');
      expect(manager.get(task.id)?.progress).toBe(100);
    });

    it('任务完成后进度应该自动变成 100', async () => {
      const task = manager.create({
        type: 'video-slice',
      });

      await manager.run(task.id, async () => {
        return '处理完成';
      });

      expect(manager.get(task.id)?.status).toBe('completed');
      expect(manager.get(task.id)?.progress).toBe(100);
    });

    it('不应该允许任务进度超过 100', async () => {
      const task = manager.create({
        type: 'video-slice',
      });

      const runPromise = manager.run(
        task.id,
        async ({ onProgress }) => {
          onProgress(101);
          return '处理完成';
        }
      );

      await expect(runPromise).rejects.toThrow();

      expect(manager.get(task.id)?.status).toBe('failed');
    });
  });


  describe('任务取消', () => {
    it('取消任务时应该触发 AbortSignal', () => {
      const task = manager.create({
        type: 'video-slice',
      });

      const signal = manager.getSignal(task.id);

      manager.cancel(task.id);

      expect(signal?.aborted).toBe(true);
      expect(manager.get(task.id)?.status).toBe('cancelled');
    });

    it('取消已经结束的任务不应该改变其状态', async () => {
      const task = manager.create({
        type: 'video-slice',
      });

      // 通过真实执行，让任务进入 completed 状态
      await manager.run(task.id, async () => {
        return '处理完成';
      });

      // 再取消已经完成的任务
      manager.cancel(task.id);

      expect(manager.get(task.id)?.status).toBe('completed');
    });
  });



  describe('非法状态转换', () => {
    it('执行不存在的任务应该抛出异常', async () => {
      await expect(
        manager.run('unknown-task-id', async () => {
          return '处理完成';
        })
      ).rejects.toThrow('任务不存在');
    });

    it('取消不存在的任务应该抛出异常', () => {
      expect(() => {
        manager.cancel('unknown-task-id');
      }).toThrow('任务不存在');
    });

    it('不应该允许 pending 任务绕过执行流程直接完成', async () => {
      const task = manager.create({
        type: 'video-slice',
      });

      // 新的公开 API 不提供直接修改任务状态的方法
      expect('update' in manager).toBe(false);

      // 任务仍然保持 pending
      expect(manager.get(task.id)?.status).toBe('pending');
    });

    it('不应该允许 completed 任务再次执行', async () => {
      const task = manager.create({
        type: 'video-slice',
      });

      await manager.run(task.id, async () => {
        return '第一次执行完成';
      });

      expect(manager.get(task.id)?.status).toBe('completed');

      await expect(
        manager.run(task.id, async () => {
          return '第二次执行';
        })
      ).rejects.toThrow();

      expect(manager.get(task.id)?.status).toBe('completed');
    });
  });




  describe('任务监听', () => {

    it('任务发生变化时应该通知监听器', async () => {
      const listener = vi.fn();

      manager.subscribe(listener);

      const task = manager.create({
        type: 'video-slice',
      });

      // subscribe 初始通知一次，create 通知一次
      expect(listener).toHaveBeenCalledTimes(2);

      let release!: () => void;

      const blocker = new Promise<void>((resolve) => {
        release = resolve;
      });

      let notifyStarted!: () => void;

      const started = new Promise<void>((resolve) => {
        notifyStarted = resolve;
      });

      const runPromise = manager.run(task.id, async () => {
        notifyStarted();

        await blocker;

        return '处理完成';
      });

      // 等待执行器真正启动
      await started;

      // processing 状态发生变化，监听器应该收到通知
      expect(listener).toHaveBeenCalledTimes(3);

      expect(
        listener.mock.lastCall?.[0][0].status
      ).toBe('processing');

      release();

      await runPromise;

      // completed 状态再次发生变化
      expect(listener).toHaveBeenCalledTimes(4);

      expect(
        listener.mock.lastCall?.[0][0].status
      ).toBe('completed');
    });


  });

  describe('任务执行器', () => {
    it('应该成功执行任务并自动完成', async () => {
      const task = manager.create({
        type: 'video-process',
      });

      const result = await manager.run(
        task.id,
        async () => {
          return '处理成功';
        }
      );

      expect(result).toBe('处理成功');
      expect(manager.get(task.id)?.status).toBe('completed');
      expect(manager.get(task.id)?.progress).toBe(100);
    });

    it('执行任务时应该更新进度', async () => {
      const task = manager.create({
        type: 'video-process',
      });

      await manager.run(task.id, async ({ onProgress }) => {
        onProgress(30);
        onProgress(60);

        return '完成';
      });

      expect(manager.get(task.id)?.status).toBe('completed');
      expect(manager.get(task.id)?.progress).toBe(100);
    });

    it('任务执行失败时应该记录错误', async () => {
      const task = manager.create({
        type: 'video-process',
      });

      await expect(
        manager.run(task.id, async () => {
          throw new Error('视频处理失败');
        })
      ).rejects.toThrow('视频处理失败');

      expect(manager.get(task.id)?.status).toBe('failed');
      expect(manager.get(task.id)?.error).toBe('视频处理失败');
    });

    it('不应该重复执行已经开始的任务', async () => {
      const task = manager.create({
        type: 'video-process',
      });

      let release!: () => void;

      const execution = manager.run(task.id, () => {
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      });

      expect(manager.get(task.id)?.status).toBe('processing');

      await expect(
        manager.run(task.id, async () => undefined)
      ).rejects.toThrow('只有等待中的任务才能执行');

      release();
      await execution;

      expect(manager.get(task.id)?.status).toBe('completed');
    });

    it('取消任务后不应该标记为完成', async () => {
      const task = manager.create({
        type: 'video-process',
      });

      const execution = manager.run(
        task.id,
        ({ signal }) => {
          return new Promise<void>((resolve, reject) => {
            signal.addEventListener(
              'abort',
              () => {
                const error = new Error('任务已取消');
                error.name = 'AbortError';
                reject(error);
              },
              { once: true }
            );
          });
        }
      );

      manager.cancel(task.id);

      await expect(execution).rejects.toThrow('任务已取消');

      expect(manager.get(task.id)?.status).toBe('cancelled');
    });
  });
  it('取消后，即使执行器成功返回，任务也不能变成 completed', async () => {
    const manager = new MediaTaskManager();
    const task = manager.create({ type: 'video' });

    let resolveExecutor!: (value: string) => void;

    const executorPromise = new Promise<string>((resolve) => {
      resolveExecutor = resolve;
    });

    const runPromise = manager.run(task.id, async () => {
      return executorPromise;
    });

    // 取消任务
    manager.cancel(task.id);

    // 模拟执行器忽略取消信号，仍然返回成功结果
    resolveExecutor('处理完成');

    await expect(runPromise).rejects.toMatchObject({
      name: 'AbortError',
    });

    expect(manager.get(task.id)?.status).toBe('cancelled');
  });

  it('取消后，执行器继续报告进度也不能更新任务', async () => {
    const manager = new MediaTaskManager();
    const task = manager.create({ type: 'video' });

    let reportProgress!: (progress: number) => void;
    let resolveExecutor!: (value: string) => void;

    const executorPromise = new Promise<string>((resolve) => {
      resolveExecutor = resolve;
    });

    const runPromise = manager.run(
      task.id,
      async ({ onProgress }) => {
        reportProgress = onProgress;
        return executorPromise;
      }
    );

    // 取消任务
    manager.cancel(task.id);

    // 模拟执行器在取消后继续报告进度
    reportProgress(50);

    // 执行器最终返回
    resolveExecutor('处理完成');

    await expect(runPromise).rejects.toMatchObject({
      name: 'AbortError',
    });

    const currentTask = manager.get(task.id);

    expect(currentTask?.status).toBe('cancelled');
    expect(currentTask?.progress).toBe(0);
  });

  describe('任务队列', () => {
    it('应该按照最大并发数量执行任务', async () => {
      const manager = new MediaTaskManager({
        maxConcurrent: 2,
      });

      const tasks = Array.from(
        { length: 4 },
        () => manager.create({ type: 'video' })
      );

      const started: string[] = [];

      let release!: () => void;

      const blocker = new Promise<void>((resolve) => {
        release = resolve;
      });

      const promises = tasks.map((task) =>
        manager.run(task.id, async () => {
          started.push(task.id);

          await blocker;

          return task.id;
        })
      );

      // 让微任务队列执行
      await Promise.resolve();

      expect(started).toHaveLength(2);

      expect(manager.get(tasks[0].id)?.status)
        .toBe('processing');

      expect(manager.get(tasks[1].id)?.status)
        .toBe('processing');

      expect(manager.get(tasks[2].id)?.status)
        .toBe('pending');

      expect(manager.get(tasks[3].id)?.status)
        .toBe('pending');

      release();

      await expect(Promise.all(promises)).resolves.toHaveLength(4);

      expect(started).toHaveLength(4);

      expect(manager.getAll().every(
        (task) => task.status === 'completed'
      )).toBe(true);
    });

    it('不允许重复提交同一个等待中的任务', async () => {
      const manager = new MediaTaskManager({
        maxConcurrent: 1,
      });

      const first = manager.create({ type: 'video' });
      const second = manager.create({ type: 'video' });

      let release!: () => void;

      const blocker = new Promise<void>((resolve) => {
        release = resolve;
      });

      const firstPromise = manager.run(
        first.id,
        async () => {
          await blocker;
          return 'done';
        }
      );

      const secondPromise = manager.run(
        second.id,
        async () => 'second'
      );

      await expect(
        manager.run(second.id, async () => 'duplicate')
      ).rejects.toThrow('任务已经提交');

      release();

      await Promise.all([firstPromise, secondPromise]);
    });

    it('取消排队中的任务后，该任务不应该再执行', async () => {
      const manager = new MediaTaskManager({
        maxConcurrent: 1,
      });

      const first = manager.create({ type: 'video' });
      const second = manager.create({ type: 'audio' });

      let releaseFirst!: () => void;

      const blocker = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });

      let secondExecuted = false;

      const firstPromise = manager.run(
        first.id,
        async () => {
          await blocker;
          return 'first';
        }
      );

      const secondPromise = manager.run(
        second.id,
        async () => {
          secondExecuted = true;
          return 'second';
        }
      );

      // 第二个任务此时应该还在等待队列
      expect(manager.get(second.id)?.status).toBe('pending');

      // 取消等待中的第二个任务
      manager.cancel(second.id);

      await expect(secondPromise).rejects.toMatchObject({
        name: 'AbortError',
      });

      expect(manager.get(second.id)?.status).toBe('cancelled');

      // 释放第一个任务
      releaseFirst();

      await firstPromise;

      // 第二个任务不能被执行
      expect(secondExecuted).toBe(false);
    });
    it('任务执行失败后，应该自动执行下一个任务', async () => {
      const manager = new MediaTaskManager({
        maxConcurrent: 1,
      });

      const first = manager.create({ type: 'video' });
      const second = manager.create({ type: 'audio' });

      let secondExecuted = false;

      const firstPromise = manager.run(
        first.id,
        async () => {
          throw new Error('模拟视频处理失败');
        }
      );

      const secondPromise = manager.run(
        second.id,
        async () => {
          secondExecuted = true;
          return 'audio completed';
        }
      );

      await expect(firstPromise).rejects.toThrow(
        '模拟视频处理失败'
      );

      await expect(secondPromise).resolves.toBe(
        'audio completed'
      );

      expect(manager.get(first.id)?.status).toBe('failed');
      expect(manager.get(second.id)?.status).toBe('completed');
      expect(secondExecuted).toBe(true);
    });
    it('取消正在运行的任务后，执行器结束前不能释放并发名额', async () => {
      const manager = new MediaTaskManager({
        maxConcurrent: 1,
      });

      const first = manager.create({ type: 'video' });
      const second = manager.create({ type: 'audio' });

      let releaseFirst!: () => void;

      const blocker = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });

      let secondExecuted = false;

      // 第一个任务启动后一直等待，不响应 AbortSignal
      const firstPromise = manager.run(
        first.id,
        async () => {
          await blocker;
          return 'first';
        }
      );

      // 第二个任务进入等待队列
      const secondPromise = manager.run(
        second.id,
        async () => {
          secondExecuted = true;
          return 'second';
        }
      );

      // 提前监听拒绝，避免未处理的 Promise rejection
      const firstRejected = expect(firstPromise).rejects.toMatchObject({
        name: 'AbortError',
      });

      // 取消第一个任务
      manager.cancel(first.id);

      // 调用方应该立即收到取消结果
      await firstRejected;

      // 但第一个 executor 仍然没有结束
      expect(manager.get(first.id)?.status).toBe('cancelled');

      // 第二个任务不能提前启动
      expect(secondExecuted).toBe(false);
      expect(manager.get(second.id)?.status).toBe('pending');

      // 现在才允许第一个 executor 真正结束
      releaseFirst();

      // 第一个 executor 结束后，第二个任务才能启动
      await expect(secondPromise).resolves.toBe('second');

      expect(secondExecuted).toBe(true);
      expect(manager.get(second.id)?.status).toBe('completed');
    });
  });

  describe('任务资源清理', () => {
    it('任务完成后应该逆序执行所有清理函数', async () => {
      const manager = new MediaTaskManager();
      const task = manager.create({ type: 'video' });

      const cleanupOrder: number[] = [];

      const result = await manager.run(
        task.id,
        async ({ onCleanup }) => {
          onCleanup(() => {
            cleanupOrder.push(1);
          });

          onCleanup(() => {
            cleanupOrder.push(2);
          });

          onCleanup(() => {
            cleanupOrder.push(3);
          });

          return '处理完成';
        }
      );

      expect(result).toBe('处理完成');
      expect(cleanupOrder).toEqual([3, 2, 1]);
      expect(manager.get(task.id)?.status).toBe('completed');
    });

    it('任务执行失败后也应该执行清理函数', async () => {
      const manager = new MediaTaskManager();
      const task = manager.create({ type: 'video' });

      let cleanupCalled = false;

      const runPromise = manager.run(
        task.id,
        async ({ onCleanup }) => {
          onCleanup(() => {
            cleanupCalled = true;
          });

          throw new Error('视频处理失败');
        }
      );

      await expect(runPromise).rejects.toThrow(
        '视频处理失败'
      );

      expect(cleanupCalled).toBe(true);
      expect(manager.get(task.id)?.status).toBe('failed');
    });

    it('任务取消后执行器结束时应该执行清理函数', async () => {
      const manager = new MediaTaskManager();
      const task = manager.create({ type: 'video' });

      let cleanupCalled = false;
      let releaseExecutor!: () => void;

      const blocker = new Promise<void>((resolve) => {
        releaseExecutor = resolve;
      });

      const runPromise = manager.run(
        task.id,
        async ({ onCleanup }) => {
          onCleanup(() => {
            cleanupCalled = true;
          });

          await blocker;

          return '处理完成';
        }
      );

      // 取消正在执行的任务
      manager.cancel(task.id);

      // 执行器结束
      releaseExecutor();

      await expect(runPromise).rejects.toMatchObject({
        name: 'AbortError',
      });

      expect(cleanupCalled).toBe(true);
      expect(manager.get(task.id)?.status).toBe('cancelled');
    });
  });

  describe('任务数据安全', () => {
    it('外部修改 get 返回的数据不应该影响内部任务', () => {
      const manager = new MediaTaskManager();

      const task = manager.create({
        type: 'video',
      });

      const externalTask = manager.get(task.id);

      if (!externalTask) {
        throw new Error('任务不存在');
      }

      externalTask.status = 'completed';
      externalTask.progress = 100;

      const internalTask = manager.get(task.id);

      expect(internalTask?.status).toBe('pending');
      expect(internalTask?.progress).toBe(0);
    });

    it('外部修改 getAll 返回的数据不应该影响内部任务', () => {
      const manager = new MediaTaskManager();

      const task = manager.create({
        type: 'video',
      });

      const externalTasks = manager.getAll();

      externalTasks[0].status = 'completed';
      externalTasks[0].progress = 100;

      const internalTask = manager.get(task.id);

      expect(internalTask?.status).toBe('pending');
      expect(internalTask?.progress).toBe(0);
    });

    it('外部修改 create 返回的数据不应该影响内部任务', () => {
      const manager = new MediaTaskManager();

      const task = manager.create({
        type: 'video',
      });

      task.status = 'completed';
      task.progress = 100;

      const internalTask = manager.get(task.id);

      expect(internalTask?.status).toBe('pending');
      expect(internalTask?.progress).toBe(0);
    });
  });
  it('一个监听器报错不应该影响其他监听器', () => {
    const manager = new MediaTaskManager();

    const listenerA = vi.fn();
    const listenerB = vi.fn(() => {
      throw new Error('监听器异常');
    });
    const listenerC = vi.fn();

    manager.subscribe(listenerA);
    manager.subscribe(listenerB);
    manager.subscribe(listenerC);

    listenerA.mockClear();
    listenerB.mockClear();
    listenerC.mockClear();

    manager.create({
      type: 'video',
    });

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerC).toHaveBeenCalledTimes(1);
  });
  it('不同监听器不应该共享任务对象引用', () => {
    const manager = new MediaTaskManager();
    const listenerA = vi.fn((tasks) => {
      if (tasks[0]) {
        tasks[0].status = 'completed';
      }
    });

    const listenerB = vi.fn();

    manager.subscribe(listenerA);
    manager.subscribe(listenerB);

    const task = manager.create({
      type: 'video',
    });

    const receivedTasks = listenerB.mock.calls.at(-1)?.[0];

    expect(receivedTasks?.[0].id).toBe(task.id);
    expect(receivedTasks?.[0].status).toBe('pending');

    expect(manager.get(task.id)?.status).toBe('pending');
  });
  it('资源清理过程中取消任务，不应该再标记为完成', async () => {
    const manager = new MediaTaskManager();

    const task = manager.create({
      type: 'video',
    });

    let releaseCleanup!: () => void;
    let notifyCleanupStarted!: () => void;

    const cleanupBlocker = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });

    const cleanupStarted = new Promise<void>((resolve) => {
      notifyCleanupStarted = resolve;
    });

    const runPromise = manager.run(task.id, async ({ onCleanup }) => {
      onCleanup(async () => {
        notifyCleanupStarted();
        await cleanupBlocker;
      });

      return '处理完成';
    });

    // 等待资源清理开始
    await cleanupStarted;

    // 在清理过程中取消任务
    manager.cancel(task.id);

    // 允许资源清理结束
    releaseCleanup();

    // run 必须以 AbortError 拒绝
    await expect(runPromise).rejects.toMatchObject({
      name: 'AbortError',
    });

    // 任务最终状态必须是 cancelled
    expect(manager.get(task.id)?.status).toBe('cancelled');
  });


  describe('任务超时', () => {
    it('任务超时后应该立即失败，但执行器结束前不能释放并发名额', async () => {
      vi.useFakeTimers();

      try {
        const manager = new MediaTaskManager({
          maxConcurrent: 1,
        });

        const firstTask = manager.create({
          type: 'video-encode',
          timeout: 1000,
        });

        const secondTask = manager.create({
          type: 'audio-extract',
        });

        let releaseFirst!: () => void;
        let notifyFirstStarted!: () => void;
        let notifySecondStarted!: () => void;
        let releaseSecond!: () => void;

        const firstBlocker = new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });

        const firstStarted = new Promise<void>((resolve) => {
          notifyFirstStarted = resolve;
        });

        const secondStarted = new Promise<void>((resolve) => {
          notifySecondStarted = resolve;
        });

        const secondBlocker = new Promise<void>((resolve) => {
          releaseSecond = resolve;
        });

        let firstSignal: AbortSignal | undefined;
        let isSecondStarted = false;

        const firstRun = manager.run(
          firstTask.id,
          async ({ signal }) => {
            firstSignal = signal;
            notifyFirstStarted();

            await firstBlocker;

            return '第一个任务完成';
          }
        );

        // 提前绑定 rejection 处理程序，避免未处理的 Promise rejection
        const firstRunRejection = expect(firstRun).rejects.toMatchObject({
          name: 'TimeoutError',
        });

        await firstStarted;

        const secondRun = manager.run(
          secondTask.id,
          async () => {
            isSecondStarted = true;
            notifySecondStarted();

            await secondBlocker;

            return '第二个任务完成';
          }
        );

        // 推进时间，让第一个任务超时
        await vi.advanceTimersByTimeAsync(1000);

        await firstRunRejection;

        // 第一个任务已经失败
        expect(manager.get(firstTask.id)?.status).toBe('failed');

        // AbortSignal 已经触发
        expect(firstSignal?.aborted).toBe(true);

        // 第一个执行器还没有结束，第二个任务不能启动
        expect(isSecondStarted).toBe(false);
        expect(manager.get(secondTask.id)?.status).toBe('pending');

        // 现在允许第一个执行器真正结束
        releaseFirst();

        // 第二个任务此时才应该开始执行
        await secondStarted;

        expect(isSecondStarted).toBe(true);
        expect(manager.get(secondTask.id)?.status).toBe('processing');

        releaseSecond();

        await secondRun;

        expect(manager.get(secondTask.id)?.status).toBe('completed');
      } finally {
        vi.useRealTimers();
      }
    });
    it('没有指定单任务超时时间时应该使用管理器默认超时时间', async () => {
      vi.useFakeTimers();

      try {
        const manager = new MediaTaskManager({
          defaultTimeout: 1000,
        });

        const task = manager.create({
          type: 'video-encode',
        });

        let notifyStarted!: () => void;

        const started = new Promise<void>((resolve) => {
          notifyStarted = resolve;
        });

        const runPromise = manager.run(
          task.id,
          async () => {
            notifyStarted();

            // 模拟一个持续运行的任务
            await new Promise<void>(() => {});

            return '完成';
          }
        );

        // 提前绑定异常处理
        const rejection = expect(runPromise).rejects.toMatchObject({
          name: 'TimeoutError',
        });

        await started;

        // 尚未到达超时时间
        await vi.advanceTimersByTimeAsync(999);

        expect(manager.get(task.id)?.status).toBe('processing');

        // 再推进 1ms，触发默认超时
        await vi.advanceTimersByTimeAsync(1);

        await rejection;

        expect(manager.get(task.id)?.status).toBe('failed');
      } finally {
        vi.useRealTimers();
      }
    });
    it('单任务超时时间应该覆盖管理器默认超时时间', async () => {
      vi.useFakeTimers();

      try {
        const manager = new MediaTaskManager({
          defaultTimeout: 1000,
        });

        const task = manager.create({
          type: 'video-encode',
          timeout: 3000,
        });

        let notifyStarted!: () => void;

        const started = new Promise<void>((resolve) => {
          notifyStarted = resolve;
        });

        const runPromise = manager.run(
          task.id,
          async () => {
            notifyStarted();

            await new Promise<void>(() => {});

            return '完成';
          }
        );

        const rejection = expect(runPromise).rejects.toMatchObject({
          name: 'TimeoutError',
        });

        await started;

        // 管理器默认超时时间已经过去
        await vi.advanceTimersByTimeAsync(1000);

        // 任务仍然应该处于执行状态
        expect(manager.get(task.id)?.status).toBe('processing');

        // 再经过 1999ms，仍然不应该超时
        await vi.advanceTimersByTimeAsync(1999);

        expect(manager.get(task.id)?.status).toBe('processing');

        // 达到单任务的 3000ms 超时时间
        await vi.advanceTimersByTimeAsync(1);

        await rejection;

        expect(manager.get(task.id)?.status).toBe('failed');
      } finally {
        vi.useRealTimers();
      }
    });
    it('排队等待时间不应该计入任务超时时间', async () => {
      vi.useFakeTimers();

      try {
        const manager = new MediaTaskManager({
          maxConcurrent: 1,
        });

        const firstTask = manager.create({
          type: 'video-encode',
        });

        const secondTask = manager.create({
          type: 'audio-extract',
          timeout: 1000,
        });

        let releaseFirst!: () => void;
        let notifyFirstStarted!: () => void;
        let notifySecondStarted!: () => void;

        const firstBlocker = new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });

        const firstStarted = new Promise<void>((resolve) => {
          notifyFirstStarted = resolve;
        });

        const secondStarted = new Promise<void>((resolve) => {
          notifySecondStarted = resolve;
        });

        const firstRun = manager.run(
          firstTask.id,
          async () => {
            notifyFirstStarted();
            await firstBlocker;
            return '第一个任务完成';
          }
        );

        await firstStarted;

        const secondRun = manager.run(
          secondTask.id,
          async () => {
            notifySecondStarted();

            await new Promise<void>(() => {});

            return '第二个任务完成';
          }
        );

        const secondRejection = expect(secondRun).rejects.toMatchObject({
          name: 'TimeoutError',
        });

        // 第二个任务等待 2000ms，但尚未开始执行
        await vi.advanceTimersByTimeAsync(2000);

        expect(manager.get(secondTask.id)?.status).toBe('pending');

        // 释放第一个任务
        releaseFirst();

        await firstRun;

        // 第二个任务现在才真正开始
        await secondStarted;

        expect(manager.get(secondTask.id)?.status).toBe('processing');

        // 开始执行后的 999ms，不应该超时
        await vi.advanceTimersByTimeAsync(999);

        expect(manager.get(secondTask.id)?.status).toBe('processing');

        // 达到 1000ms，触发超时
        await vi.advanceTimersByTimeAsync(1);

        await secondRejection;

        expect(manager.get(secondTask.id)?.status).toBe('failed');
      } finally {
        vi.useRealTimers();
      }
    });
    it('资源清理时间不应该计入任务超时时间', async () => {
      vi.useFakeTimers();

      try {
        const manager = new MediaTaskManager();

        const task = manager.create({
          type: 'video-encode',
          timeout: 1000,
        });

        let releaseCleanup!: () => void;
        let notifyCleanupStarted!: () => void;

        const cleanupBlocker = new Promise<void>((resolve) => {
          releaseCleanup = resolve;
        });

        const cleanupStarted = new Promise<void>((resolve) => {
          notifyCleanupStarted = resolve;
        });

        const runPromise = manager.run(
          task.id,
          async ({ onCleanup }) => {
            onCleanup(async () => {
              notifyCleanupStarted();
              await cleanupBlocker;
            });

            return '执行器完成';
          }
        );

        await cleanupStarted;

        // 执行器已经结束，任务正在 cleanup 阶段
        expect(manager.get(task.id)?.status).toBe('processing');

        // cleanup 已经耗时 2000ms，超过原来的 1000ms 超时
        await vi.advanceTimersByTimeAsync(2000);

        // 不应该因为 cleanup 耗时而超时
        expect(manager.get(task.id)?.status).toBe('processing');

        releaseCleanup();

        // 这里不应该发生 rejection
        await runPromise;

        expect(manager.get(task.id)?.status).toBe('completed');

      } finally {
        vi.useRealTimers();
      }
    });
    it('主动取消任务后应该清除超时计时器', async () => {
      vi.useFakeTimers();

      try {
        const manager = new MediaTaskManager();

        const task = manager.create({
          type: 'video-encode',
          timeout: 1000,
        });

        let releaseExecutor!: () => void;

        const executorBlocker = new Promise<void>((resolve) => {
          releaseExecutor = resolve;
        });

        const runPromise = manager.run(
          task.id,
          async () => {
            await executorBlocker;
            return '执行完成';
          }
        );

        // 提前监听 rejection，避免未处理的 Promise rejection
        const runRejection = expect(runPromise).rejects.toMatchObject({
          name: 'AbortError',
        });

        // 主动取消任务
        manager.cancel(task.id);

        await runRejection;

        expect(manager.get(task.id)?.status).toBe('cancelled');

        // 推进时间，超过原来的 timeout
        await vi.advanceTimersByTimeAsync(2000);

        // 任务仍然是主动取消状态，而不是超时失败
        expect(manager.get(task.id)?.status).toBe('cancelled');

        // 执行器真正结束后，正常释放并发名额
        releaseExecutor();

        await vi.waitFor(() => {
          expect(manager.get(task.id)?.status).toBe('cancelled');
        });
      } finally {
        vi.useRealTimers();
      }
    });
    it('任务正常完成后应该清除超时计时器', async () => {
      vi.useFakeTimers();

      try {
        const manager = new MediaTaskManager();

        const task = manager.create({
          type: 'video-encode',
          timeout: 1000,
        });

        const runPromise = manager.run(
          task.id,
          async () => {
            return '执行成功';
          }
        );

        await expect(runPromise).resolves.toBe('执行成功');

        expect(manager.get(task.id)?.status).toBe('completed');

        // 推进时间，超过原来的超时时间
        await vi.advanceTimersByTimeAsync(2000);

        // 已完成的任务不应该再触发超时
        expect(manager.get(task.id)?.status).toBe('completed');
      } finally {
        vi.useRealTimers();
      }
    });
    it('任务执行失败后应该清除超时计时器', async () => {
      vi.useFakeTimers();

      try {
        const manager = new MediaTaskManager();

        const task = manager.create({
          type: 'video-encode',
          timeout: 1000,
        });

        const runPromise = manager.run(
          task.id,
          async () => {
            throw new Error('视频编码失败');
          }
        );

        // 提前监听 rejection
        const runRejection = expect(runPromise).rejects.toThrow(
          '视频编码失败'
        );

        await runRejection;

        expect(manager.get(task.id)?.status).toBe('failed');
        expect(manager.get(task.id)?.error).toBe('视频编码失败');

        // 推进时间，超过原来的超时时间
        await vi.advanceTimersByTimeAsync(2000);

        // 不能再次触发 TimeoutError 或改变原有错误
        expect(manager.get(task.id)?.status).toBe('failed');
        expect(manager.get(task.id)?.error).toBe('视频编码失败');
      } finally {
        vi.useRealTimers();
      }
    });

  });

  describe('参数边界校验', () => {
    it('不应该创建空类型的任务', () => {
      expect(() => {
        manager.create({ type: '' });
      }).toThrow('任务类型不能为空');
    });

    it('不应该允许注册非函数类型的清理函数', async () => {
      const task = manager.create({
        type: 'test',
      });

      await expect(
        manager.run(task.id, async ({ onCleanup }) => {
          onCleanup(null as any);
        })
      ).rejects.toThrow('清理函数必须是一个函数');

      expect(manager.get(task.id)?.status).toBe('failed');
    });

    it('不应该允许 NaN 作为任务进度', async () => {
      const task = manager.create({
        type: 'test',
      });

      await expect(
        manager.run(task.id, async ({ onProgress }) => {
          onProgress(Number.NaN);
        })
      ).rejects.toThrow(
        '任务进度必须是 0 到 100 之间的有效数字'
      );

      expect(manager.get(task.id)?.status).toBe('failed');
    });


    it.each([
      0,
      -1,
      NaN,
      Infinity,
      -Infinity,
      2_147_483_648,
    ])(
      '不应该接受非法的单任务超时时间：%s',
      (timeout) => {
        const manager = new MediaTaskManager();

        expect(() => {
          manager.create({
            type: 'video-encode',
            timeout,
          });
        }).toThrow('任务超时时间');
      }
    );

    it.each([
      0,
      -1,
      NaN,
      Infinity,
      -Infinity,
      2_147_483_648,
    ])(
      '不应该接受非法的默认超时时间：%s',
      (defaultTimeout) => {
        expect(() => {
          new MediaTaskManager({
            defaultTimeout,
          });
        }).toThrow('默认任务超时时间');
      }
    );

    it('应该允许最大合法超时时间', () => {
      const maxTimeout = 2_147_483_647;

      // 管理器默认超时时间允许最大值
      expect(() => {
        new MediaTaskManager({
          defaultTimeout: maxTimeout,
        });
      }).not.toThrow();

      const manager = new MediaTaskManager();

      // 单任务超时时间允许最大值
      expect(() => {
        manager.create({
          type: 'video-encode',
          timeout: maxTimeout,
        });
      }).not.toThrow();
    });

  });
});