/**
  文件选择、拖拽上传。
  文件类型检查和元数据解析。
  预览 URL 创建与释放。
  文件移除。
  加载状态、错误状态。
  过期请求保护。
 */
import { useEffect, useRef, useState } from 'react';

import type {
  ChangeEvent,
  DragEvent,
} from 'react';

import {
  getMediaFileInfo,
  readMediaMetadata,
  type MediaMetadata,
} from '@xinmark/media-core';

interface UseMediaFileOptions {
  onFileSelected?: () => void;
  onFileRemoved?: () => void;
  onVideoMetadata?: (metadata: MediaMetadata) => void;
}

export function useMediaFile(options: UseMediaFileOptions = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const metadataRequestIdRef = useRef(0);

  // 释放旧的视频预览地址，避免 Blob URL 泄漏
  useEffect(() => {
    if (!previewUrl) return;

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // 选择媒体文件
  async function handleSelectFile(selectedFile: File) {
    const info = getMediaFileInfo(selectedFile);

    if (info.kind !== 'video' && info.kind !== 'audio') {
      setError('请选择视频或音频文件');
      return;
    }

    const requestId = ++metadataRequestIdRef.current;

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setMetadata(null);
    setError('');
    setLoading(true);

    options.onFileSelected?.();

    try {
      const result = await readMediaMetadata(selectedFile);

      if (requestId !== metadataRequestIdRef.current) {
        return;
      }

      setMetadata(result);

      if (result.kind === 'video') {
        options.onVideoMetadata?.(result);
      }
    } catch (err) {
      if (requestId !== metadataRequestIdRef.current) {
        return;
      }

      setError(
        err instanceof Error ? err.message : '文件解析失败'
      );
    } finally {
      if (requestId === metadataRequestIdRef.current) {
        setLoading(false);
      }
    }
  }

  // 文件选择框
  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      await handleSelectFile(selectedFile);
    }
  }

  // 拖拽进入上传区域
  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  // 拖拽离开上传区域
  function handleDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();

    if (
      event.currentTarget.contains(
        event.relatedTarget as Node | null
      )
    ) {
      return;
    }

    setIsDragging(false);
  }

  // 拖放文件
  async function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (!droppedFile) return;

    await handleSelectFile(droppedFile);
  }

  // 移除当前文件
  function handleRemoveFile() {
    metadataRequestIdRef.current++;

    setFile(null);
    setPreviewUrl('');
    setMetadata(null);
    setError('');
    setLoading(false);
    setIsDragging(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    options.onFileRemoved?.();
  }

  return {
    file,
    previewUrl,
    metadata,
    loading,
    error,
    setError,
    isDragging,
    fileInputRef,
    handleSelectFile,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveFile,
  };
}
