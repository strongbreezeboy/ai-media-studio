
import { MediaTaskManager } from '@xinmark/media-core';

import type {
  CreateTaskOptions,
  MediaTask,
  MediaTaskManagerOptions,
  ReadMetadataOptions,
  TaskExecutor,
} from '@xinmark/media-core';

import { MediaInspector } from './inspector/inspector.js';

import type {
  MediaInspectionResult,
} from './inspector/types.js';

import { VideoTrimmer } from './processors/video-trimmer.js';
import type { VideoTrimOptions } from './processors/video-trimmer.js';
/**
 * 媒体引擎配置
 */
export interface MediaEngineOptions extends MediaTaskManagerOptions {}

/**
 * 媒体任务执行结果
 */
export interface MediaTaskExecution<T> {
  /**
   * 任务初始状态快照
   */
  task: MediaTask;

  /**
   * 任务执行结果
   */
  result: Promise<T>;
}

/**
 * 媒体引擎
 *
 * 统一管理媒体处理能力和任务生命周期。
 */
export class MediaEngine {
  private readonly taskManager: MediaTaskManager;

  private readonly inspector: MediaInspector;

  private readonly videoTrimmer: VideoTrimmer;
  constructor(
    options: MediaEngineOptions = {},
    inspector: MediaInspector = new MediaInspector(),
    videoTrimmer: VideoTrimmer = new VideoTrimmer(),
  ) {
    this.taskManager = new MediaTaskManager(options);
    this.inspector = inspector;
    this.videoTrimmer = videoTrimmer;
  }

  /**
   * 检查媒体文件
   */
  inspect(
    file: File,
    options: ReadMetadataOptions = {}
  ): Promise<MediaInspectionResult> {
    return this.inspector.inspect(file, options);
  }


  /**
   * 创建并执行视频裁剪任务
   */
  trimVideo(
    file: File,
    options: VideoTrimOptions,
    taskOptions: Omit<CreateTaskOptions, 'type'> = {},
  ): MediaTaskExecution<Blob> {
    const task = this.createTask({
      ...taskOptions,
      type: 'video-trim',
    });

    const result = this.runTask(
      task.id,
      (context) => this.videoTrimmer.trim(file, options, context),
    );

    return {
      task,
      result,
    };
  }

  /**
   * 创建媒体任务
   */
  createTask(options: CreateTaskOptions): MediaTask {
    return this.taskManager.create(options);
  }

  /**
   * 执行媒体任务
   */
  runTask<T>(
    taskId: string,
    executor: TaskExecutor<T>
  ): Promise<T> {
    return this.taskManager.run(taskId, executor);
  }

  /**
   * 获取指定任务
   */
  getTask(taskId: string): MediaTask | undefined {
    return this.taskManager.get(taskId);
  }

  /**
   * 获取全部任务
   */
  getTasks(): MediaTask[] {
    return this.taskManager.getAll();
  }

  /**
   * 获取任务取消信号
   */
  getTaskSignal(taskId: string): AbortSignal | undefined {
    return this.taskManager.getSignal(taskId);
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): void {
    this.taskManager.cancel(taskId);
  }

  /**
   * 订阅任务状态变化
   */
  subscribe(
    listener: (tasks: MediaTask[]) => void
  ): () => void {
    return this.taskManager.subscribe(listener);
  }
}
