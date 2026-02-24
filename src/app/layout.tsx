'use client';

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, CalendarDays, Brain, Users, Film, Building2 } from "lucide-react";

const navItems = [
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
      </head>
      <body className="antialiased">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-[220px] flex-shrink-0 border-r border-white/[0.06] bg-white/[0.02] flex flex-col">
            <div className="p-5 pb-4">
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                ⚡ Mission Control
              </h1>
            </div>
            <nav className="flex-1 px-3 space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-indigo-500/10 text-white border-l-2 border-indigo-500 -ml-px pl-[11px]'
                        : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/[0.06]">
              <p className="text-xs text-neutral-500">localhost:3001</p>
              <p className="text-xs text-neutral-400 mt-0.5">Babbage Fleet</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
