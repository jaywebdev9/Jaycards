/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          500: "#0f766e",
          600: "#0d6b64",
          700: "#115e59",
          900: "#134e4a",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
