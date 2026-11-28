# @xinmark/media-engine

A TypeScript browser-based audio and video processing engine built on top of [Mediabunny](https://mediabunny.dev/).

`@xinmark/media-engine` provides a unified API for browser-based media inspection, metadata extraction, and media task management.

It builds on [`@xinmark/media-core`](https://www.npmjs.com/package/@xinmark/media-core) for task lifecycle management and uses Mediabunny as its underlying media processing library.

## Features

- **Media Inspection** — Inspect browser-based audio and video files.
- **Metadata Extraction** — Read media duration, dimensions, MIME type, and file information.
- **Media Readability** — Check whether a media file can be read by Mediabunny.
- **Task Management** — Create, execute, cancel, and monitor media tasks.
- **Concurrency Control** — Configure the maximum number of concurrently running tasks.
- **Task Timeout** — Configure default and per-task execution timeouts.
- **Cancellation Support** — Use `AbortSignal` to notify running tasks when they are cancelled.
- **Resource Management** — Register cleanup callbacks and release resources after task execution.
- **TypeScript Support** — Built-in TypeScript declarations.

## Installation

```bash
npm install @xinmark/media-engine
```

The package uses the following dependencies:

- [`@xinmark/media-core`](https://www.npmjs.com/package/@xinmark/media-core)
- [`mediabunny`](https://mediabunny.dev/)

## Quick Start

```ts
import { MediaEngine } from '@xinmark/media-engine';

const engine = new MediaEngine({
  maxConcurrent: 2,
  defaultTimeout: 60000,
});

const input = document.querySelector<HTMLInputElement>('#file-input');

input?.addEventListener('change', async () => {
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  try {
    const result = await engine.inspect(file);

    console.log('Media inspection result:', result);
  } catch (error) {
    console.error('Media inspection failed:', error);
  }
});
```

## API Reference

### 1. MediaEngine

`MediaEngine` is the main entry point of the package.

It provides a unified interface for media inspection and task lifecycle management.

#### Create an engine

```ts
import { MediaEngine } from '@xinmark/media-engine';

const engine = new MediaEngine({
  maxConcurrent: 2,
  defaultTimeout: 60000,
});
```

Configuration options:

| Option | Type | Default | Description |
|---|---|---|---|
| `maxConcurrent` | `number` | `2` | Maximum number of concurrently running tasks |
| `defaultTimeout` | `number` | `undefined` | Default task execution timeout in milliseconds |

A task-specific timeout takes precedence over the default timeout.

#### Inspect a media file

```ts
const result = await engine.inspect(file);

console.log(result);
```

#### Create a task

```ts
const task = engine.createTask({
  type: 'video-processing',
  timeout: 30000,
});

console.log(task.id);
console.log(task.status);
```

#### Run a task

```ts
const task = engine.createTask({
  type: 'video-processing',
});

const result = await engine.runTask(
  task.id,
  async ({ signal, onProgress, onCleanup }) => {
    const objectUrl = URL.createObjectURL(file);

    onCleanup(() => {
      URL.revokeObjectURL(objectUrl);
    });

    signal.throwIfAborted();

    onProgress(30);

    // Perform your media processing operation here.

    signal.throwIfAborted();

    onProgress(100);

    return {
      fileName: file.name,
    };
  },
);

console.log(result);
```

The task executor receives a context containing:

| Property | Type | Description |
|---|---|---|
| `signal` | `AbortSignal` | Cancellation signal |
| `onProgress` | `(progress: number) => void` | Update task progress |
| `onCleanup` | `(cleanup: TaskCleanup) => void` | Register a resource cleanup callback |

Cleanup callbacks are executed in reverse registration order.

They are executed after the task executor finishes, whether the executor succeeds or fails.

#### Get a task

```ts
const task = engine.getTask(taskId);
```

#### Get all tasks

```ts
const tasks = engine.getTasks();
```

#### Subscribe to task updates

```ts
const unsubscribe = engine.subscribe((tasks) => {
  console.log('Task updates:', tasks);
});

// Unsubscribe when no longer needed.
unsubscribe();
```

Subscribers receive an initial snapshot immediately after subscribing.

#### Cancel a task

```ts
engine.cancelTask(taskId);
```

Cancellation triggers the task's `AbortSignal`.

The executor should monitor the signal and stop its work when cancellation is requested.

Cancellation does not forcibly terminate asynchronous operations that ignore the signal. Such operations continue to occupy a concurrency slot until they actually finish.

#### Get a task AbortSignal

```ts
const signal = engine.getTaskSignal(taskId);

if (signal?.aborted) {
  console.log('Task has been cancelled');
}
```

### 2. MediaInspector

`MediaInspector` provides media file inspection functionality.

```ts
import { MediaInspector } from '@xinmark/media-engine';

const inspector = new MediaInspector();

const result = await inspector.inspect(file);

console.log(result);
```

You can also access inspection through the main `MediaEngine` instance:

```ts
const result = await engine.inspect(file);
```

### 3. MediabunnyAdapter

`MediabunnyAdapter` encapsulates Mediabunny input operations.

It keeps application-level code independent of the underlying third-party media API.

#### Check media readability

```ts
import { MediabunnyAdapter } from '@xinmark/media-engine';

const adapter = new MediabunnyAdapter();

const readable = await adapter.canRead(file);

console.log('Readable:', readable);
```

#### Read media metadata

```ts
const metadata = await adapter.readMetadata(file, {
  timeout: 15000,
});

console.log(metadata);
```

The returned metadata contains:

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Original file name |
| `size` | `number` | File size in bytes |
| `mimeType` | `string` | MIME type |
| `kind` | `'video' \| 'audio'` | Media type |
| `duration` | `number` | Media duration in seconds |
| `width` | `number \| undefined` | Video display width |
| `height` | `number \| undefined` | Video display height |

Width and height are available for video files.

The metadata reading timeout defaults to 15 seconds.

The adapter disposes its Mediabunny input after the operation finishes, including when reading fails or times out.

## Task Lifecycle

Tasks are managed by `@xinmark/media-core`.

Supported task statuses:

| Status | Description |
|---|---|
| `pending` | Waiting to execute |
| `processing` | Currently executing |
| `completed` | Successfully completed |
| `failed` | Execution failed or timed out |
| `cancelled` | Cancelled by the caller |

The task manager supports:

- Maximum concurrency limits.
- Task-specific timeouts.
- Default execution timeouts.
- AbortSignal-based cancellation.
- Progress reporting.
- Resource cleanup callbacks.
- Task state subscriptions.

Timeout counting starts when the executor actually begins running, not while it waits in the queue.

## Architecture

```text
Application
    |
    v
MediaEngine
    |
    +---------------------------+
    |                           |
    v                           v
MediaInspector             MediaTaskManager
    |                           |
    v                           v
MediabunnyAdapter          @xinmark/media-core
    |
    v
Mediabunny
```

The architecture separates application-facing APIs, task management, and third-party media processing.

This abstraction allows the underlying media implementation to evolve without requiring application code to depend directly on Mediabunny.

## Browser Compatibility

This package is designed for browser environments.

It relies on browser APIs such as:

- `File`
- `Blob`
- `URL.createObjectURL`
- `AbortController`
- `AbortSignal`

Supported media formats and codec capabilities depend on the browser and the underlying Mediabunny implementation.

This package is not currently designed as a Node.js server-side media processing library.

## Current Status

The current version focuses on the foundational media engine:

- Media file inspection.
- Audio and video metadata extraction.
- Mediabunny input abstraction.
- Task lifecycle management.
- Concurrency control.
- Cancellation and timeout handling.
- Resource cleanup.

Advanced media editing and exporting capabilities are not yet implemented.

## Roadmap

Planned development:

- Video trimming and exporting.
- Audio extraction.
- Background music and voice-over.
- Video transitions and effects.
- WebCodecs integration.
- Web Audio API integration.
- Worker-based media processing.
- AI-powered media workflows.

The current implementation uses Mediabunny. Research and development of a custom media processing engine may be considered after the product features are completed.

## Related Projects

- [`@xinmark/media-core`](https://www.npmjs.com/package/@xinmark/media-core) — Core utilities and media task management.
- [Mediabunny](https://mediabunny.dev/) — Browser-based media processing library.
- [AI Media Studio](https://github.com/strongbreezeboy/ai-media-studio) — The main project repository.

## License

[MIT](./LICENSE) © Xin Mark
