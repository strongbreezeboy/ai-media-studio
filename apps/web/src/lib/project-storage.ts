
/**
 * AI Media Studio 项目存储模块
 *
 * 使用浏览器原生 IndexedDB 保存项目记录和处理结果。
 * 不依赖第三方数据库。
 */

const DB_NAME = 'ai-media-studio';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

/**
 * 项目状态
 */
export type MediaProjectStatus = 'completed' | 'failed';

/**
 * 项目参数
 */
export interface VideoTrimParameters {
  start: number;
  end: number;
}

/**
 * 项目记录
 */
export interface MediaProject {
  id: string;
  taskId: string;
  name: string;
  type: string;
  sourceName: string;
  createdAt: number;
  updatedAt: number;
  status: MediaProjectStatus;
  parameters: VideoTrimParameters;
  outputBlob?: Blob;
  error?: string;
}

/**
 * 打开数据库
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('当前浏览器不支持 IndexedDB'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });

        store.createIndex('createdAt', 'createdAt', {
          unique: false,
        });

        store.createIndex('taskId', 'taskId', {
          unique: true,
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('打开项目数据库失败'));
    };

    request.onblocked = () => {
      reject(new Error('项目数据库升级被其他页面阻止，请关闭其他项目页面后重试'));
    };
  });
}

/**
 * 保存项目
 */
export async function saveProject(
  project: MediaProject,
): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      store.put(project);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () => {
        reject(transaction.error ?? new Error('保存项目失败'));
      };

      transaction.onabort = () => {
        reject(transaction.error ?? new Error('保存项目事务已中止'));
      };
    });
  } finally {
    database.close();
  }
}

/**
 * 获取最近项目
 */
export async function getRecentProjects(
  limit = 20,
): Promise<MediaProject[]> {
  const database = await openDatabase();

  try {
    return await new Promise<MediaProject[]>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const projects = request.result as MediaProject[];

        projects.sort((a, b) => b.updatedAt - a.updatedAt);

        resolve(projects.slice(0, Math.max(0, limit)));
      };

      request.onerror = () => {
        reject(request.error ?? new Error('读取项目列表失败'));
      };
    });
  } finally {
    database.close();
  }
}

/**
 * 根据 ID 获取项目
 */
export async function getProjectById(
  id: string,
): Promise<MediaProject | undefined> {
  const database = await openDatabase();

  try {
    return await new Promise<MediaProject | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(id);

      request.onsuccess = () => {
        resolve(request.result as MediaProject | undefined);
      };

      request.onerror = () => {
        reject(request.error ?? new Error('读取项目详情失败'));
      };
    });
  } finally {
    database.close();
  }
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');

      transaction.objectStore(STORE_NAME).delete(id);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () => {
        reject(transaction.error ?? new Error('删除项目失败'));
      };

      transaction.onabort = () => {
        reject(transaction.error ?? new Error('删除项目事务已中止'));
      };
    });
  } finally {
    database.close();
  }
}
