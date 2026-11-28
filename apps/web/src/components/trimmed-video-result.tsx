
interface TrimmedVideoResultProps {
  url: string;
}

export function TrimmedVideoResult({
  url,
}: TrimmedVideoResultProps) {
  if (!url) return null;

  return (
    <section className="mt-8 rounded-2xl border border-green-700 bg-slate-900 p-8">
      <h2 className="text-xl font-semibold">
        裁剪结果
      </h2>

      <video
        src={url}
        controls
        playsInline
        className="mt-6 max-h-[480px] w-full rounded-xl bg-black"
      />

      <a
        href={url}
        download="trimmed-video.mp4"
        className="mt-6 inline-block rounded-lg bg-green-600 px-5 py-3 text-sm font-medium hover:bg-green-500"
      >
        下载裁剪后的视频
      </a>
    </section>
  );
}
