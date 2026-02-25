'use client';

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, CalendarDays, Brain, Users, Film, Building2 } from "lucide-react";

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/content', label: 'Content', icon: Film },
  { href: '/office', label: 'Office', icon: Building2 },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <head>
        <title>Mission Control</title>
        <meta name="description" content="OpenClaw Fleet Dashboard" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-[200px] flex-shrink-0 border-r border-white/[0.06] bg-[#0c0c14] flex flex-col">
            <Link href="/" className="block px-5 pt-5 pb-4 group">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  MC
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white tracking-tight">Mission Control</h1>
                  <p className="text-[10px] text-neutral-500 tracking-wide">OPENCLAW FLEET</p>
                </div>
              </div>
            </Link>
            <nav className="flex-1 px-3 space-y-0.5 mt-1">
              {navItems.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                      active
                        ? 'bg-indigo-500/12 text-white nav-glow'
                        : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-indigo-400' : ''} />
                    {label}
                    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
                <p className="text-[11px] text-neutral-400">System Online</p>
              </div>
              <p className="text-[10px] text-neutral-600 mt-1.5 pl-4">localhost:3001</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6 dot-grid">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
