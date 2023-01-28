/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace"],
      },
      colors: {
        black: "#0E0D0C",
      },
      keyframes: {
        smallSlideUp: {
          "0%": { opacity: 0, transform: "translateY(0.5rem)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        smallSlideUp: "smallSlideUp 0.1s ease-out",
      },
    },
  },
  plugins: [],
};
