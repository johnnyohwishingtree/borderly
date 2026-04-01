/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Semantic design tokens ──────────────────────────────────
        // Reference CSS variables from src/app/global.css.
        // Auto-switch light/dark — no dark: prefix needed.
        //
        // Usage: text-primary, bg-surface, border-default
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        tertiary: 'var(--color-text-tertiary)',
        muted: 'var(--color-text-muted)',
        accent: 'var(--color-text-accent)',
        error: 'var(--color-text-error)',
        success: 'var(--color-text-success)',
        warning: 'var(--color-text-warning)',
        surface: {
          DEFAULT: 'var(--color-bg-surface)',
          secondary: 'var(--color-bg-surface-secondary)',
          tertiary: 'var(--color-bg-surface-tertiary)',
        },
        'border-default': 'var(--color-border-default)',
        'border-light': 'var(--color-border-light)',
      },
    },
  },
  plugins: [],
};
