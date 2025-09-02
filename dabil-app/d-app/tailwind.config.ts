import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Brand colors extracted from Dabil logo
        brand: {
          50: "#eff6ff",
          100: "#dbeafe", 
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb", // Main brand blue
          700: "#1d4ed8", // Dark blue
          800: "#1e40af",
          900: "#1e3a8a",
        },
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a", 
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b", // Main gold
          600: "#d97706", // Dark gold
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        // Dark mode colors
        dark: {
          50: "#18181b",
          100: "#27272a",
          200: "#3f3f46",
          300: "#52525b",
          400: "#71717a",
          500: "#a1a1aa",
          600: "#d4d4d8",
          700: "#e4e4e7",
          800: "#f4f4f5",
          900: "#fafafa",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        glow: {
          "from": { boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)" },
          "to": { boxShadow: "0 0 30px rgba(245, 158, 11, 0.6), 0 0 40px rgba(245, 158, 11, 0.3)" },
        },
      },
      boxShadow: {
        "gold": "0 10px 25px -3px rgba(245, 158, 11, 0.1), 0 4px 6px -2px rgba(245, 158, 11, 0.05)",
        "gold-lg": "0 25px 50px -12px rgba(245, 158, 11, 0.25)",
        "dark-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;