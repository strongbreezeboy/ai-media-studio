
import Link from 'next/link';
import { RecentProjects } from '@/components/recent-projects';
const tools = [
  {
    title: '视频处理',
    description: '视频裁剪、编辑、格式转换',
    icon: '▶',
    color: 'violet',
    href: '/video',
    status: 'available',
    action: '进入工作台',
  },
  {
    title: '音频处理',
    description: '音频剪辑、提取、格式转换',
    icon: '♫',
    color: 'blue',
    href: null,
    status: 'planned',
    action: '即将开放',
  },
  {
    title: 'AI 创作',
    description: 'AI 视频、智能配音、AI 漫剧',
    icon: '✦',
    color: 'purple',
    href: null,
    status: 'planned',
    action: '即将开放',
  },
  {
    title: '我的项目',
    description: '管理项目与创作记录',
    icon: '▤',
    color: 'cyan',
    href: null,
    status: 'planned',
    action: '即将开放',
  },
];

const statusItems = [
  {
    label: '处理方式',
    value: '本地优先',
    description: '优先浏览器本地处理',
  },
  {
    label: '核心引擎',
    value: 'Mediabunny',
    description: '浏览器音视频处理',
  },
  {
    label: '产品状态',
    value: '持续迭代',
    description: '功能持续扩展',
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-7">
      {/* 创作欢迎区域 */}
      <section className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#1b1838] via-[#121a30] to-[#0d1220] p-7 md:p-10">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute bottom-[-100px] right-1/4 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-400">
              WELCOME TO AI MEDIA STUDIO
            </p>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white md:text-4xl">
              开始创作，让灵感变成作品
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 md:text-base">
              从视频剪辑、音频处理到 AI 内容创作，
              在一个专业工作台中完成你的创作流程。
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/video"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110"
              >
                <span>▶</span>
                开始视频创作
                <span>→</span>
              </Link>

              <span className="text-xs text-slate-500">
                浏览器本地处理 · 隐私优先
              </span>
            </div>
          </div>

          <div className="hidden min-w-52 flex-col gap-3 rounded-2xl border border-white/10 bg-[#0b1020]/50 p-5 backdrop-blur-sm lg:flex">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">创作工作台</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
            </div>
            <div className="text-3xl font-bold text-white">01</div>
            <p className="text-xs text-slate-500">已开放的创作工具</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
            </div>
            <p className="text-xs text-slate-500">更多能力正在建设中</p>
          </div>
        </div>
      </section>

      {/* 快捷创作 */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-violet-500" />
              <h2 className="text-lg font-semibold text-white">
                快捷创作
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              选择创作工具，快速进入工作流程
            </p>
          </div>

          <span className="hidden text-xs text-slate-600 sm:block">
            CREATIVE TOOLS
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tools.map((tool) => (
            <div
              key={tool.title}
              className="group rounded-xl border border-slate-800/90 bg-[#101827] p-5 transition duration-200 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-[#141d30]"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border text-xl ${
                    tool.color === 'violet'
                      ? 'border-violet-500/20 bg-violet-500/10 text-violet-400'
                      : tool.color === 'blue'
                        ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                        : tool.color === 'purple'
                          ? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
                          : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400'
                  }`}
                >
                  {tool.icon}
                </div>

                {tool.status === 'available' ? (
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                    已开放
                  </span>
                ) : (
                  <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs text-slate-500">
                    规划中
                  </span>
                )}
              </div>

              <h3 className="mt-5 text-base font-semibold text-white">
                {tool.title}
              </h3>

              <p className="mt-2 min-h-10 text-xs leading-5 text-slate-400">
                {tool.description}
              </p>

              {tool.href ? (
                <Link
                  href={tool.href}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-violet-400 transition hover:text-violet-300"
                >
                  {tool.action}
                  <span>→</span>
                </Link>
              ) : (
                <span className="mt-5 inline-block text-sm text-slate-600">
                  {tool.action}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 最近项目 */}
      <RecentProjects />

      {/* 工作台状态 */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-indigo-500" />
          <h2 className="text-lg font-semibold text-white">
            工作台状态
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {statusItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-800/90 bg-[#101827] p-5"
            >
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-3 text-base font-semibold text-slate-100">
                {item.value}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
