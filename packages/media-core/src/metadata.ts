import type { MediaKind } from "./index";

export interface MediaMetadata {
  name: string;
  size: number;
  mimeType: string;
  kind: 'video'| 'audio';
  duration: number;
  width?: number;
  height?: number;
}

export interface ReadMetadataOptions{
  timeout?: number;
}

/**
 * 读取音视频的基础元数据
 */
export function readMediaMetadata(file: File,options:ReadMetadataOptions={}):Promise<MediaMetadata>{
   const kind:MediaKind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'unknown';

   if (kind === 'unknown') {
    return Promise.reject(
      new Error('暂不支持该文件类型，请上传视频或音频文件')
    );
   }
   //  创建本地文件的临时访问地址。
   const url = URL.createObjectURL(file);
   const media:HTMLMediaElement = kind === 'video' ? document.createElement('video') : document.createElement('audio');
   const timeout = options.timeout ?? 15000;

   return new Promise((resolve,reject) => {
      let settled = false;
      const cleanup = () => {
        clearTimeout(timer);
        media.removeAttribute('src');
        media.load();
        // 释放临时 URL，避免资源泄漏。
        URL.revokeObjectURL(url);
      }
      const finish = (callback:() => void) =>{
        if(settled) return;
        settled = true;
        cleanup();
        callback();
      };
      const timer = setTimeout(() => {
        finish(()=> reject(new Error('读取媒体信息超时')));
      }, timeout);
      media.preload = 'metadata';
      if (kind === 'video') {
        const video = media as HTMLVideoElement;
        video.muted = true;
        video.playsInline = true;
      }

      // 媒体元数据加载完成事件。
      media.onloadedmetadata = () => {
        const metadata:MediaMetadata = {
          name: file.name,
          size: file.size,
          mimeType:file.type,
          kind,
          duration: media.duration
        };
        if (kind === 'video') {
          const video = media as HTMLVideoElement;
          metadata.width = video.videoWidth;
          metadata.height = video.videoHeight;
        }
        finish(()=>resolve(metadata))
      };
      media.onerror = () => {
        finish(() => reject(new Error('媒体文件解析失败')));
      }
      media.src = url;
      media.load();
   })

}