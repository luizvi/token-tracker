import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary: "var(--color-bg-tertiary)",
          card: "var(--color-bg-card)",
        },
        border: {
          DEFAULT: "var(--color-border-primary)",
          hover: "var(--color-border-hover)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "#1fe879",
          hover: "#1bd16d",
          fg: "#0a3d20",
        },
        danger: "#d1242f",
        warning: "#d4a72c",
      },
      fontFamily: {
        mono: ["'Monaspace Radon'", "Monaco", "Menlo", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
