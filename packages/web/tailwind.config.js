/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace"],
      },
      colors: {
        black: "#0E0D0C",
      },
    },
  },
  plugins: [],
};
