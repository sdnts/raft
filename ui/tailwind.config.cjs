/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        black: "#0E0D0C",
        ui: "#161514",
        borders: "#262422",
      },
    },
  },
  plugins: [],
};
