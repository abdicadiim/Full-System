/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#125663",
        "background-light": "#f6f8f8",
        "background-dark": "#121e20",
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0 12px 28px rgba(15, 23, 42, 0.10)",
      },
    },
  },
  plugins: [],
};

