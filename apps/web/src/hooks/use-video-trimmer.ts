// 负责裁剪范围的状态、计算和边界约束
import { useCallback, useState } from 'react';
export function useVideoTrimmer(duration: number) {
  const [trimStart, setTrimStart] = useState('0');
  const [trimEnd, setTrimEnd] = useState('');

  // 初始化裁剪范围
  const resetTrim = useCallback((duration: number) => {
    setTrimStart('0');
    setTrimEnd(String(Number(duration.toFixed(2))));
  }, []);
  // 修改裁剪开始时间
  function handleTrimStartChange(value: string) {
    const nextStart = Number(value);
    const currentEnd = Number(trimEnd);

    if (!Number.isFinite(nextStart)) return;

    if (nextStart >= 0 && nextStart < currentEnd) {
      setTrimStart(value);
    }
  }

  // 修改裁剪结束时间
  function handleTrimEndChange(value: string) {
    // 允许用户暂时清空输入框
    if (value === '') {
      setTrimEnd('');
      return;
    }

    const nextEnd = Number(value);
    const currentStart = Number(trimStart);

    // 拒绝非法数字
    if (!Number.isFinite(nextEnd)) return;

    // 只接受有效的裁剪结束时间
    if (nextEnd > currentStart && nextEnd <= duration) {
      setTrimEnd(value);
    }
  }

  // 开始时间对应的时间轴百分比
  const startPercent = duration > 0
    ? (Number(trimStart) / duration) * 100
    : 0;

  // 结束时间对应的时间轴百分比
  const endPercent = duration > 0
    ? (Number(trimEnd) / duration) * 100
    : 100;

  // 当前裁剪时长
  const trimDuration = Math.max(
    0,
    Number(trimEnd) - Number(trimStart)
  );

  return {
    trimStart,
    trimEnd,
    setTrimStart,
    setTrimEnd,
    resetTrim,
    startPercent,
    endPercent,
    trimDuration,
    handleTrimStartChange,
    handleTrimEndChange,
  };
}