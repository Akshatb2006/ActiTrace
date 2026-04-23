/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0a0a0a",
          soft: "#171717",
          muted: "#404040",
          faint: "#737373",
        },
        paper: {
          DEFAULT: "#fafafa",
          card: "#ffffff",
          sub: "#f4f4f4",
        },
        line: {
          DEFAULT: "#e5e5e5",
          strong: "#d4d4d4",
        },
        accent: {
          DEFAULT: "#ff3b30",
          soft: "#ffe5e3",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI",
          "Roboto", "Inter", "sans-serif",
        ],
        mono: [
          "ui-monospace", "SFMono-Regular", "Menlo", "Monaco",
          "JetBrains Mono", "Consolas", "monospace",
        ],
      },
      letterSpacing: {
        wider: "0.08em",
        widest: "0.16em",
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};
