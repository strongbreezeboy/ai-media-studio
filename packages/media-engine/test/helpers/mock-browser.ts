
import { vi } from 'vitest';

export function mockVideoElement() {
  const video = {
    preload: '',
    muted: false,
    playsInline: false,
    duration: 120,
    videoWidth: 1920,
    videoHeight: 1080,
    onloadedmetadata: null as (() => void) | null,
    onerror: null as (() => void) | null,

    removeAttribute: vi.fn(),
    load: vi.fn(),

    set src(_value: string) {
      queueMicrotask(() => {
        this.onloadedmetadata?.();
      });
    },
  };

  vi.stubGlobal('document', {
    createElement: vi.fn().mockReturnValue(video),
  });

  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-video');

  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  return video;
}
