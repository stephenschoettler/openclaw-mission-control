import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  safelist: [
    // Team page — layer gradient dots (dynamic layer.color strings)
    'from-yellow-500', 'to-amber-600',
    'from-indigo-500', 'to-purple-600',
    'from-emerald-500', 'to-teal-600',
    'from-rose-500', 'to-pink-600',
    'from-cyan-500', 'to-blue-600',
    // Team page — status dot colors (dynamic cfg.dot strings)
    'bg-green-400', 'bg-yellow-400', 'bg-neutral-600',
  ],
  plugins: [],
};
export default config;
