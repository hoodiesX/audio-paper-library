import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f5f7",
        ink: "#111111",
        muted: "#6e6e73",
        panel: "#ffffff",
        line: "#e5e5e7",
        accent: "#0a84ff",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0, 0, 0, 0.06)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
