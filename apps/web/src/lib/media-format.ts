/**
 * 格式化媒体时长
 * 例如：125 秒 -> 2:05
 */
export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return '未知';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

/**
 * 格式化文件大小
 */
export function formatSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}