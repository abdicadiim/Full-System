/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "rgb(21, 99, 114)",
        teal: "rgb(21, 99, 114)",
        blue: {
          50: "rgba(21, 99, 114, 0.05)",
          100: "rgba(21, 99, 114, 0.1)",
          200: "rgba(21, 99, 114, 0.2)",
          300: "rgba(21, 99, 114, 0.3)",
          400: "rgba(21, 99, 114, 0.4)",
          500: "rgba(21, 99, 114, 0.6)",
          600: "rgb(21, 99, 114)",
          700: "rgb(18, 85, 98)",
          800: "rgb(15, 71, 82)",
          900: "rgb(12, 57, 66)",
        },
        slate: {
          800: "rgb(21, 99, 114)",
          900: "rgb(18, 85, 98)",
        },
        black: "rgb(21, 99, 114)",
      },
      boxShadow: {
        card: "0 10px 25px -12px rgba(16,24,40,.12)"
      }
    },
  },
  plugins: [],
}
