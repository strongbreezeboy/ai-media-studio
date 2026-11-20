
# @xinmark/media-core

**A lightweight TypeScript core library for browser-based media processing.**

`@xinmark/media-core` 是 AI Media Studio 的底层媒体基础库，提供媒体类型识别、音视频元数据读取，以及可靠的异步任务管理能力。

它旨在为浏览器端音视频处理应用提供统一的基础能力，包括任务生命周期管理、并发控制、取消、超时和资源清理。

## Features

- **Media Detection**：识别视频、音频、图片及未知文件类型。
- **Media Metadata**：读取音视频文件的基本元数据。
- **Task Management**：统一管理异步媒体处理任务。
- **Concurrency Control**：限制任务最大并发执行数量。
- **Task Cancellation**：通过 AbortSignal 通知执行器取消任务。
- **Timeout Control**：支持管理器默认超时和单任务超时。
- **Resource Cleanup**：支持注册清理函数，并按照注册顺序的逆序执行。
- **Progress Tracking**：跟踪任务执行进度。
- **Task Subscription**：监听任务状态变化。
- **TypeScript Support**：提供完整的 TypeScript 类型声明。

## Installation

使用 npm：

```bash
npm install @xinmark/media-core
```

使用 pnpm：

```bash
pnpm add @xinmark/media-core
```

使用 yarn：

```bash
yarn add @xinmark/media-core
```

## Quick Start

```ts
import {
  getMediaKind,
  getMediaFileInfo,
  readMediaMetadata,
  MediaTaskManager,
} from '@xinmark/media-core';

// 创建媒体任务管理器
const manager = new MediaTaskManager({
  maxConcurrent: 2,
  defaultTimeout: 30000,
});

// 监听任务变化
const unsubscribe = manager.subscribe((tasks) => {
  console.log('任务列表：', tasks);
});

// 获取文件输入
const input = document.querySelector<HTMLInputElement>('#file');

input?.addEventListener('change', async () => {
  const file = input.files?.[0];

  if (!file) return;

  // 识别媒体类型
  console.log(getMediaKind(file));

  // 获取文件基本信息
  console.log(getMediaFileInfo(file));

  // 读取媒体元数据
  const metadata = await readMediaMetadata(file);

  console.log(metadata);

  // 创建任务
  const task = manager.create({
    type: 'video-processing',
  });

  // 执行任务
  const result = await manager.run(task.id, async ({
    signal,
    onProgress,
    onCleanup,
  }) => {
    onProgress(30);

    // 在这里执行实际媒体处理
    onCleanup(() => {
      console.log('释放任务资源');
    });

    if (signal.aborted) {
      throw new Error('任务已取消');
    }

    onProgress(100);

    return '处理完成';
  });

  console.log(result);
});

// 不再需要监听时取消订阅
// unsubscribe();
```

## Media APIs

### 1. getMediaKind(file)

根据文件 MIME 类型识别媒体类别。

```ts
import { getMediaKind } from '@xinmark/media-core';

const kind = getMediaKind(file);
```

返回类型：

```ts
type MediaKind = 'video' | 'audio' | 'image' | 'unknown';
```

| MIME 类型       | 返回值  |
| --------------- | ------- |
| video/mp4       | video   |
| audio/mpeg      | audio   |
| image/png       | image   |
| application/pdf | unknown |

注意：该方法根据 MIME 类型判断，不会读取文件实际内容，也不负责验证文件真实性。

### 2. getMediaFileInfo(file)

获取媒体文件的基本信息。

```ts
import { getMediaFileInfo } from '@xinmark/media-core';

const info = getMediaFileInfo(file);

console.log(info);
```

返回类型：

```ts
interface MediaFileInfo {
  name: string;
  size: number;
  type: string;
  kind: MediaKind;
}
```

### 3. readMediaMetadata(file, options?)

读取视频或音频文件的基础元数据。

```ts
import { readMediaMetadata } from '@xinmark/media-core';

const metadata = await readMediaMetadata(file, {
  timeout: 15000,
});

console.log(metadata);
```

参数：

| 参数            | 类型   | 默认值 | 说明                   |
| --------------- | ------ | ------ | ---------------------- |
| file            | File   | 必填   | 浏览器 File 对象       |
| options.timeout | number | 15000  | 读取超时时间，单位毫秒 |

返回类型：

```ts
interface MediaMetadata {
  name: string;
  size: number;
  mimeType: string;
  kind: 'video' | 'audio';
  duration: number;
  width?: number;
  height?: number;
}
```

视频文件返回宽度和高度，音频文件不返回这两个字段。

异常情况：

- 不支持的文件类型：抛出错误。
- 媒体文件解析失败：抛出错误。
- 读取超时：抛出错误。

注意：该 API 使用浏览器的 HTMLMediaElement 和 URL.createObjectURL，因此需要在浏览器环境中调用。

## Task Manager

`MediaTaskManager` 负责管理异步任务的创建、执行、取消、超时、进度和资源清理。

### 1. 创建管理器

```ts
import { MediaTaskManager } from '@xinmark/media-core';

const manager = new MediaTaskManager({
  maxConcurrent: 2,
  defaultTimeout: 30000,
});
```

配置：

| 参数           | 类型   | 默认值 | 说明                       |
| -------------- | ------ | ------ | -------------------------- |
| maxConcurrent  | number | 2      | 最大并发执行数量           |
| defaultTimeout | number | 不限制 | 默认任务超时时间，单位毫秒 |

`maxConcurrent` 必须是大于 0 的整数。

`defaultTimeout` 必须是大于 0 且不超过 2147483647 的有限数字。

### 2. 创建任务

```ts
const task = manager.create({
  type: 'video-processing',
  timeout: 10000,
});

console.log(task.id);
console.log(task.status);
```

参数：

```ts
interface CreateTaskOptions {
  type: string;
  timeout?: number;
}
```

初始任务状态：

```ts
type MediaTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

任务信息：

```ts
interface MediaTask {
  id: string;
  type: string;
  status: MediaTaskStatus;
  progress: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}
```

任务创建成功后，初始状态为 `pending`，进度为 `0`。

单任务的 `timeout` 优先于管理器的 `defaultTimeout`。

### 3. 执行任务

```ts
const result = await manager.run(task.id, async ({
  signal,
  onProgress,
  onCleanup,
}) => {
  onProgress(20);

  // 执行处理逻辑
  onProgress(60);

  // 注册资源清理函数
  onCleanup(() => {
    console.log('清理资源');
  });

  if (signal.aborted) {
    throw new Error('任务已取消');
  }

  onProgress(100);

  return {
    success: true,
  };
});
```

`run()` 接收：

- `id`：任务 ID。
- `executor`：异步任务执行函数。

返回：

```ts
Promise<T>
```

任务执行器必须返回 Promise。

### 4. 更新任务进度

```ts
onProgress(50);
```

进度范围为 `0–100`。

只有处于 `processing` 状态的任务才能更新进度。

任务成功完成后，进度自动更新为 `100`。

任务被取消后，执行器继续报告的进度不会再更新任务状态。

### 5. 任务取消

```ts
manager.cancel(task.id);
```

取消任务后：

- 任务状态变为 `cancelled`。
- 触发对应的 AbortSignal。
- `run()` 返回的 Promise 会以 `AbortError` 拒绝。
- 等待队列中的任务会被移除。
- 正在运行的执行器如果没有响应取消信号，会继续运行。
- 执行器真正结束后才执行资源清理并释放并发名额。

因此，业务代码应主动监听 `signal`，并在适当时机停止工作。

```ts
const result = await manager.run(task.id, async ({
  signal,
  onProgress,
}) => {
  if (signal.aborted) {
    throw new Error('任务已取消');
  }

  onProgress(30);

  // 执行可中断的异步操作
  await someAsyncOperation();

  if (signal.aborted) {
    throw new Error('任务已取消');
  }

  onProgress(100);

  return 'success';
});
```

注意：示例中的 `someAsyncOperation()` 代表业务自己的异步操作，并非本库提供的 API。

### 6. 任务超时

可以在管理器级别设置默认超时：

```ts
const manager = new MediaTaskManager({
  defaultTimeout: 30000,
});
```

也可以为单个任务设置超时：

```ts
const task = manager.create({
  type: 'video-export',
  timeout: 10000,
});
```

超时规则：

- 超时时间从执行器真正开始运行时计算。
- 等待队列的时间不计入超时。
- 资源清理时间不计入超时。
- 超时后任务状态变为 `failed`。
- 执行器收到 AbortSignal。
- 调用方收到名称为 `TimeoutError` 的错误。
- 执行器真正结束后才释放并发名额。

主动取消和超时的状态不同：

| 场景     | 任务状态  | 错误名称               |
| -------- | --------- | ---------------------- |
| 主动取消 | cancelled | AbortError             |
| 执行超时 | failed    | TimeoutError           |
| 执行异常 | failed    | 原始错误或清理聚合错误 |

### 7. 资源清理

通过 `onCleanup()` 注册资源清理函数：

```ts
const task = manager.create({
  type: 'video-processing',
});

await manager.run(task.id, async ({ onCleanup }) => {
  const url = URL.createObjectURL(file);

  onCleanup(() => {
    URL.revokeObjectURL(url);
  });

  return 'done';
});
```

资源清理规则：

- 任务成功、失败或取消后都会尝试执行清理。
- 清理函数按照注册顺序的逆序执行。
- 清理函数只执行一次。
- 一个清理函数失败，不会阻止其他清理函数执行。
- 多个清理错误会通过 `AggregateError` 聚合。

### 8. 查询任务

查询单个任务：

```ts
const task = manager.get(taskId);
```

查询所有任务：

```ts
const tasks = manager.getAll();
```

两个方法都返回任务数据副本，外部修改不会直接影响管理器内部状态。

### 9. 获取取消信号

```ts
const signal = manager.getSignal(taskId);
```

返回类型：

```ts
AbortSignal | undefined
```

任务进入终态后，其控制器会被清理，因此可能返回 `undefined`。

### 10. 订阅任务变化

```ts
const unsubscribe = manager.subscribe((tasks) => {
  console.log('任务发生变化：', tasks);
});
```

订阅后会立即收到一次当前任务列表，后续任务发生变化时继续通知。

每个监听器收到独立的数据快照。

监听器发生异常时，不会阻止其他监听器执行。

取消订阅：

```ts
unsubscribe();
```

## Task Lifecycle

```text
pending
   |
   v
processing
   |
   +-------> completed
   |
   +-------> failed
   |
   +-------> cancelled
```

终态包括：

- completed
- failed
- cancelled

终态任务不能再次执行，也不能继续更新。

## Browser Requirements

当前版本依赖浏览器环境中的部分 Web API：

- File
- AbortController / AbortSignal
- crypto.randomUUID()
- HTMLMediaElement
- URL.createObjectURL()
- URL.revokeObjectURL()
- document.createElement()

其中，媒体元数据读取功能需要 DOM 环境。

本库当前面向浏览器端媒体处理场景，不承诺所有 API 均可在纯 Node.js 环境中直接使用。

## Development

克隆项目：

```bash
git clone https://github.com/strongbreezeboy/ai-media-studio.git
cd ai-media-studio
```

安装依赖：

```bash
pnpm install
```

运行测试：

```bash
pnpm --filter @xinmark/media-core test
```

构建：

```bash
pnpm --filter @xinmark/media-core build
```

## Project Status

当前版本：`0.1.0`

目前已实现：

- 媒体类型识别
- 媒体基本信息读取
- 音视频元数据读取
- 任务生命周期管理
- 并发队列
- 任务取消
- 任务超时
- 进度跟踪
- 资源清理
- 任务订阅

后续规划：

- 更完善的媒体处理抽象
- Worker 任务调度
- 媒体解码和编码能力
- 音视频处理流水线
- 更丰富的媒体工具接口

以上规划不代表当前版本已经实现。

## License

MIT
