import type { Config } from "tailwindcss";

export default {
  darkMode: ["selector", ".dark-mode"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        amber:        "#f6bf26",
        "amber-2":    "#ffe8a8",
        "amber-3":    "#9a6700",
        "bio-dark":   "#07152f",
        "bio-dark-2": "#020817",
        "bio-rail":   "#020817",
        "bio-panel":  "#07152f",
        "bio-bg":     "#dbe1e7",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
} satisfies Config;
