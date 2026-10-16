// Tailwind v4 runs as a single PostCSS plugin — no tailwind.config.js needed.
// Theme tokens (colors, breakpoints) live in app/globals.css under @theme.
const config = {
  plugins: { "@tailwindcss/postcss": {} },
};

export default config;
