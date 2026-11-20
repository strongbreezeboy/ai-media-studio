
/**
 * 媒体任务状态
 */
export type MediaTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * 媒体任务信息
 */
export interface MediaTask {
  id: string;
  type: string;
  status: MediaTaskStatus;
  progress: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 创建任务参数
 */
export interface CreateTaskOptions {
  /**
   * 任务类型
   */
  type: string;

  /**
   * 任务超时时间，单位毫秒
   * 不传则使用管理器默认配置
   */
  timeout?: number;
}


/**
 * 资源清理函数
 */
export type TaskCleanup = () => void | Promise<void>;

/**
 * 任务执行上下文
 */
export interface TaskExecutorContext {
  signal: AbortSignal;

  /**
   * 更新任务进度
   */
  onProgress: (progress: number) => void;

  /**
   * 注册资源清理函数
   */
  onCleanup: (cleanup: TaskCleanup) => void;
}


/**
 * 任务执行函数
 */
export type TaskExecutor<T> = (
  context: TaskExecutorContext
) => Promise<T>;


/**
 * 任务管理器配置
 */
export interface MediaTaskManagerOptions {
  /**
   * 最大并发执行数量，默认 2
   */
  maxConcurrent?: number;

  /**
   * 默认任务超时时间，单位毫秒
   * 不设置表示默认不超时
   */
  defaultTimeout?: number;
}

/**
 * 内部任务队列项
 */
interface QueuedTask {
  id: string;
  execute: () => void;
  reject: (error: Error) => void;
}

/**
 * 正在运行的执行器记录
 */
interface RunningTask {
  id: string;
  reject: (error: Error) => void;
}

/**
 * 创建任务超时错误
 */
function createTimeoutError(timeout: number): Error {
  const error = new Error(
    `任务执行超时，超过 ${timeout} 毫秒`
  );

  error.name = 'TimeoutError';

  return error;
}


/**
 * 媒体任务管理器
 */
export class MediaTaskManager {
  private tasks = new Map<string, MediaTask>();

  private controllers = new Map<string, AbortController>();
  /**
   * 任务超时时间
   * 不存在表示该任务不设置超时
  */
  private taskTimeouts = new Map<string, number>();

  private listeners = new Set<
    (tasks: MediaTask[]) => void
  >();

  /**
   * 最大并发执行数量
   */
  private readonly maxConcurrent: number;

  /**
   * 默认任务超时时间
  */
  private readonly defaultTimeout?: number;

  /**
   * 等待执行的任务队列
   */
  private queue: QueuedTask[] = [];

  /**
   * 已提交执行的任务 ID
   * 用于防止重复提交
   */
  private scheduledIds = new Set<string>();

  /**
   * 正在运行的执行器
   * 即使用户已经取消任务，只要执行器没有真正结束，
   * 就继续占用并发名额
  */
  private runningTasks = new Map<string, RunningTask>();

  /**
   * 正在运行任务的超时计时器
  */
  private timeoutTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(options: MediaTaskManagerOptions = {}) {
    const maxConcurrent = options.maxConcurrent ?? 2;
    const defaultTimeout = options.defaultTimeout;
    if (
      defaultTimeout !== undefined &&
      (
        !Number.isFinite(defaultTimeout) ||
        defaultTimeout <= 0 ||
        defaultTimeout > 2_147_483_647
      )
    ) {
      throw new Error(
        '默认任务超时时间必须是大于 0 且不超过 2147483647 的有效数字'
      );
    }

    if (
      !Number.isInteger(maxConcurrent) ||
      maxConcurrent < 1
    ) {
      throw new Error('最大并发数量必须是大于 0 的整数');
    }

    this.maxConcurrent = maxConcurrent;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * 创建任务
   */
  create(options: CreateTaskOptions): MediaTask {
    // 此判断避免创建出没有有效类型的任务
    if (
      !options ||
      typeof options.type !== 'string' ||
      !options.type.trim()
    ) {
      throw new Error('任务类型不能为空');
    }
    const timeout = options.timeout ?? this.defaultTimeout;

    if (
      timeout !== undefined &&
      (
        !Number.isFinite(timeout) ||
        timeout <= 0 ||
        timeout > 2_147_483_647
      )
    ) {
      throw new Error(
        '任务超时时间必须是大于 0 且不超过 2147483647 的有效数字'
      );
    }
    const id = crypto.randomUUID();
    const now = Date.now();

    const task: MediaTask = {
      id,
      type: options.type,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(id, task);
    this.controllers.set(id, new AbortController());

    if (timeout !== undefined) {
      this.taskTimeouts.set(id, timeout);
    }

    this.notify();

    return { ...task };
  }

  /**
   * 获取任务
   */
  get(id: string): MediaTask | undefined {
    const task = this.tasks.get(id);
    return task ? { ...task } : undefined;
  }

  /**
   * 获取全部任务
   */
  getAll(): MediaTask[] {
    return Array.from(
      this.tasks.values(),
      (task) => ({ ...task })
    );
  }

  /**
   * 获取任务的取消信号
   */
  getSignal(id: string): AbortSignal | undefined {
    return this.controllers.get(id)?.signal;
  }

  /**
  * 提交任务到执行队列
  å*/
  async run<T>(
    id: string,
    executor: TaskExecutor<T>
  ): Promise<T> {
    const task = this.tasks.get(id);

    if (!task) {
      throw new Error(`任务不存在：${id}`);
    }

    if (task.status !== 'pending') {
      throw new Error('只有等待中的任务才能执行');
    }

    if (this.scheduledIds.has(id)) {
      throw new Error('任务已经提交，不能重复提交');
    }

    const controller = this.controllers.get(id);

    if (!controller) {
      throw new Error('任务控制器不存在');
    }

    return new Promise<T>((resolve, reject) => {
      const queuedTask: QueuedTask = {
        id,

        execute: () => {
          const runningTask: RunningTask = {
            id,
            reject,
          };

          // 先记录真实运行状态，再启动执行器
          this.runningTasks.set(id, runningTask);

          void this.executeTask(id, executor, controller)
            .then(resolve, reject)
            .finally(() => {
              // 只有执行器真正结束，才释放并发名额
              this.runningTasks.delete(id);
              this.scheduledIds.delete(id);

              this.processQueue();
            });
        },

        reject,
      };

      this.scheduledIds.add(id);
      this.queue.push(queuedTask);

      this.processQueue();
    });
  }

  /**
   * 真正执行任务
  */
  private async executeTask<T>(
  id: string,
  executor: TaskExecutor<T>,
  controller: AbortController
): Promise<T> {


    const { signal } = controller;

    // 保存当前任务注册的清理函数
    const cleanups: TaskCleanup[] = [];

    // 保证清理函数只执行一次
    let cleanupExecuted = false;

    /**
     * 按照注册顺序的逆序释放资源
     */
    const runCleanups = async (): Promise<void> => {
      if (cleanupExecuted) return;

      cleanupExecuted = true;

      const errors: unknown[] = [];

      for (const cleanup of cleanups.reverse()) {
        try {
          await cleanup();
        } catch (error) {
          errors.push(error);
        }
      }

      if (errors.length > 0) {
        throw new AggregateError(
          errors,
          '任务资源清理失败'
        );
      }
    };

    this.#update(id, {
    status: 'processing',
  });

  // 清理当前任务的超时计时器
  const clearTaskTimeout = (): void => {
    const timer = this.timeoutTimers.get(id);

    if (timer !== undefined) {
      clearTimeout(timer);
      this.timeoutTimers.delete(id);
    }
  };

  // 获取任务超时时间
  const timeout = this.taskTimeouts.get(id);

  // 只在执行器真正开始运行时启动计时器
  if (timeout !== undefined) {
    const timer = setTimeout(() => {
      // 防止已经被清理的旧计时器执行
      if (this.timeoutTimers.get(id) !== timer) {
        return;
      }

      const currentTask = this.tasks.get(id);

      // 只允许处理中任务触发超时
      if (!currentTask || currentTask.status !== 'processing') {
        return;
      }

      const timeoutError = createTimeoutError(timeout);

      // 通知执行器停止工作
      controller.abort();

      // 超时属于失败，不属于主动取消
      this.#update(id, {
        status: 'failed',
        error: timeoutError.message,
      });

        // 立即结束调用方的等待
        this.runningTasks.get(id)?.reject(timeoutError);
      }, timeout);

      this.timeoutTimers.set(id, timer);
    }

    try {
      const result = await executor({
        signal,

        onProgress: (progress) => {
          if (signal.aborted) return;

          this.#update(id, {
            progress,
          });
        },

        onCleanup: (cleanup) => {
          if (typeof cleanup !== 'function') {
            throw new TypeError('清理函数必须是一个函数');
          }
          if (cleanupExecuted) {
            throw new Error('任务资源已经开始清理，不能继续注册');
          }

          cleanups.push(cleanup);
        },
      });
      // 执行器已经结束，超时不再计算 cleanup 时间
      clearTaskTimeout();
      if (signal.aborted) {
        const error = new Error('任务已取消');
        error.name = 'AbortError';
        throw error;
      }

      // 清理资源成功后，再次检查任务是否被取消
      await runCleanups();

      if (signal.aborted) {
        const error = new Error('任务已取消');
        error.name = 'AbortError';
        throw error;
      }

      // 这里没有 await，检查与状态更新之间不会被其他任务打断
      this.#update(id, {
        status: 'completed',
      });

      return result;
    } catch (error) {
      // 执行器失败或被中断，停止超时计时
      clearTaskTimeout();
      let finalError = error;
      // 无论成功还是失败，都尝试清理资源
      try {
        await runCleanups();
      } catch (cleanupError) {
        finalError = new AggregateError(
          [error, cleanupError],
          '任务执行或资源清理失败'
        );
      }

      // 只有尚未结束的任务才能更新为失败
      const currentTask = this.tasks.get(id);
      if (
        currentTask &&
        !this.isTerminalStatus(currentTask.status)
      ) {
        this.#update(id, {
          status: 'failed',
          error:
            finalError instanceof Error
              ? finalError.message
              : '任务执行失败',
        });
      }

      throw finalError;
    }
  }


  /**
   * 调度等待队列
  */
  private processQueue(): void {
    while (
      this.runningTasks.size < this.maxConcurrent &&
      this.queue.length > 0
    ) {
      const queuedTask = this.queue.shift();

      if (!queuedTask) return;

      const task = this.tasks.get(queuedTask.id);

      // 跳过已经不再等待的任务
      if (!task || task.status !== 'pending') {
        this.scheduledIds.delete(queuedTask.id);
        queuedTask.reject(
          new Error(
            task
              ? `任务当前状态为 ${task.status}，无法执行`
              : `任务不存在：${queuedTask.id}`
          )
        );
        continue;
      }

      // 启动任务
      queuedTask.execute();
    }
  }

  /**
   * 更新任务状态
   */
  #update(
  id: string,
  changes: Partial<
    Pick<MediaTask, 'status' | 'progress' | 'error'>
  >
  ): void {
    const task = this.tasks.get(id);

    if (!task) {
      throw new Error(`任务不存在：${id}`);
    }

    if (this.isTerminalStatus(task.status)) {
      throw new Error('任务已经结束，不能继续更新');
    }

    const progress = changes.progress ?? task.progress;

    if (
      !Number.isFinite(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      throw new Error('任务进度必须是 0 到 100 之间的有效数字');
    }

    const nextStatus = changes.status ?? task.status;
    if (
      changes.status &&
      !this.canTransition(task.status, nextStatus)
    ) {
      throw new Error(
        `非法任务状态转换：${task.status} -> ${nextStatus}`
      );
    }
    if (
      changes.progress !== undefined &&
      nextStatus !== 'processing' &&
      nextStatus !== 'completed'
    ) {
      throw new Error('只有处理中或完成的任务才能更新进度');
    }
    if (nextStatus === 'completed') {
      changes = {
        ...changes,
        progress: 100,
      };
    }

    Object.assign(task, changes, {
      updatedAt: Date.now(),
    });
    /**
     无论任务最终是：
      - completed
      - failed
      - cancelled
      都会经过 #update() 的终态处理。
     */

    if (this.isTerminalStatus(nextStatus)) {
      // 清理 AbortController
      this.controllers.delete(id);
      // 清理任务超时配置
      this.taskTimeouts.delete(id);
      // 清理超时计时器
      const timeoutTimer = this.timeoutTimers.get(id);
      if (timeoutTimer !== undefined) {
        clearTimeout(timeoutTimer);
        this.timeoutTimers.delete(id);
      }
    }

    this.notify();
  }

  private isTerminalStatus(
  status: MediaTaskStatus
  ): boolean {
    return (
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled'
    );
  }

  /**
   * 取消任务
  */
  cancel(id: string): void {
    const task = this.tasks.get(id);

    if (!task) {
      throw new Error(`任务不存在：${id}`);
    }

    if (this.isTerminalStatus(task.status)) {
      return;
    }

    const error = new Error('任务已取消');
    error.name = 'AbortError';

    const controller = this.controllers.get(id);

    // 通知执行器停止工作
    controller?.abort();

    // 从等待队列中移除任务
    const queueIndex = this.queue.findIndex(
      (item) => item.id === id
    );

    if (queueIndex !== -1) {
      const [queuedTask] = this.queue.splice(queueIndex, 1);

      this.scheduledIds.delete(id);

      // 结束排队任务对应的 Promise
      queuedTask.reject(error);
    }

    // 如果执行器正在运行，立即结束调用方的等待
    // 但不删除 runningTasks 中的记录
    const runningTask = this.runningTasks.get(id);

    if (runningTask) {
      runningTask.reject(error);
    }

    this.#update(id, {
      status: 'cancelled',
    });
  }

  /**
   * 监听任务变化
  */
  subscribe(
    listener: (tasks: MediaTask[]) => void
  ): () => void {
    this.listeners.add(listener);

    // 首次通知也需要隔离监听器异常
    try {
      listener(this.getAll());
    } catch (error) {
      console.error(
        '[MediaTaskManager] 任务监听器初始化失败：',
        error
      );
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 判断任务状态转换是否合法
  */
  private canTransition(
    current: MediaTaskStatus,
    next: MediaTaskStatus
  ): boolean {
    const transitions: Record<
      MediaTaskStatus,
      MediaTaskStatus[]
    > = {
      pending: ['processing', 'failed', 'cancelled'],
      processing: ['completed', 'failed', 'cancelled'],
      completed: [],
      failed: [],
      cancelled: [],
    };

    return transitions[current].includes(next);
  }

  /**
   * 通知订阅者
  */
  private notify(): void {
    [...this.listeners].forEach((listener) => {
      try {
        // 每个监听器拿到独立的数据快照
        listener(this.getAll());
      } catch (error) {
        // 监听器异常不能影响其他监听器
        console.error(
          '[MediaTaskManager] 任务监听器执行失败：',
          error
        );
      }
    });
  }
}