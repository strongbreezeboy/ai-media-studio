
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppShellProps {
  children: React.ReactNode;
}

const navigation = [
  { label: '首页', href: '/' },
  { label: '视频处理', href: '/video' },
  { label: '音频处理', href: null },
  { label: 'AI 创作', href: null },
  { label: '任务管理', href: null },
  { label: '个人中心', href: null },
  { label: '设置', href: null },
  { label: '关于', href: null },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100 md:flex">
      {/* 左侧导航 */}
      <aside className="w-full shrink-0 border-r border-slate-800/80 bg-[#0d1220] text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col">
        <div className="border-b border-slate-800/80 px-6 py-6">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-violet-400">AI</span> Media Studio
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            在线音视频创作平台
          </p>
        </div>

        <nav className="flex gap-2 overflow-x-auto p-4 md:flex-1 md:flex-col">
          {navigation.map((item) => {
            const isActive = item.href === pathname;

            const className = `shrink-0 rounded-xl px-4 py-3 text-sm transition-colors ${
              isActive
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 font-medium text-white shadow-lg shadow-violet-950/30'
                : item.href
                  ? 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                  : 'cursor-not-allowed text-slate-600'
            }`;

            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className={className}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ) : (
              <div
                key={item.label}
                className={className}
                aria-disabled="true"
                title="功能规划中"
              >
                {item.label}
              </div>
            );
          })}
        </nav>

        <div className="hidden border-t border-slate-800/80 p-4 md:block">
          <div className="rounded-xl border border-slate-800 bg-[#151c2d] p-4">
            <p className="text-sm font-medium text-slate-200">
              创作空间
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              让音视频创作更简单
            </p>
          </div>
        </div>
      </aside>

      {/* 右侧工作区 */}
      <div className="min-w-0 flex-1 bg-[#080b14]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#0d1220]/95 px-6 backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-slate-100">
              创作工作台
            </p>
          </div>

          <span className="text-xs text-slate-500">
            本地处理 · 隐私优先
          </span>
        </header>

        <main className="min-w-0 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
