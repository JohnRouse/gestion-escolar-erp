/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#1E1B4B",
        indigo: "#3730A3",
        violet: "#6D28D9",
        "purple-lt": "#EDE9FE",
        "green-lt": "#DCFCE7",
        green: "#16A34A",
        "red-lt": "#FEE2E2",
        red: "#DC2626",
        "amber-lt": "#FEF3C7",
        amber: "#D97706",
        "blue-lt": "#DBEAFE",
        blue: "#2563EB",
        "gray-50": "#F9FAFB",
        "gray-100": "#F3F4F6",
        "gray-200": "#E5E7EB",
        "gray-300": "#D1D5DB",
        "gray-400": "#9CA3AF",
        "gray-500": "#6B7280",
        "gray-700": "#374151",
        "gray-900": "#111827",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};