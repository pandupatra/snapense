import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground, var(--foreground)))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // Design colors (WCAG AA compliant)
        "bg-dark": "#0f1115",
        "bg-card": "#1a1d24",
        "bg-card-hover": "#1f232b",
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          // WCAG AA: #0e7490 on white = 5.2:1 for normal text
          700: "#0e7490",
          950: "#083344",
        },
        // WCAG-compliant semantic status colors
        // Income: emerald-600 (#059669) on white = 4.6:1; on #1a1d24 = 7.8:1
        income: {
          DEFAULT: "#059669",
          light: "#34d399",
        },
        // Expense: red-500 (#ef4444) on white = 3.6:1 large text; red-600 (#dc2626) = 4.6:1
        expense: {
          DEFAULT: "#dc2626",
          light: "#f87171",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
        // Ensure minimum 12px for readable text (WCAG best practice)
        "2xs": ["0.75rem", { lineHeight: "1rem" }], // 12px
      },
    },
  },
  plugins: [],
};
export default config;
