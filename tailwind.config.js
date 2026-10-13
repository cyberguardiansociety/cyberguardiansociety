/**
 * Tailwind CSS config for Cyber Guardian Society's two-color themes.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './data/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-cabinet)', 'sans-serif'],
        sans: ['var(--font-space-grotesk)', 'sans-serif'],
        mono: ['var(--font-space-grotesk)', 'sans-serif'],
        space: ['var(--font-space-grotesk)', 'sans-serif'],
        cabinet: ['var(--font-cabinet)', 'sans-serif'],
      },
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        line: 'var(--line)',
        mint: {
          DEFAULT: 'var(--mint)',
          dim: 'var(--mint-dim)',
          on: 'var(--on-mint)',
        },
        pine: {
          500: 'var(--pine-500)',
          600: 'var(--pine-600)',
          700: 'var(--pine-700)',
          text: 'var(--pine-text)',
        },
        sage: { 100: 'var(--sage-100)' },
        brass: { 500: 'var(--brass-500)', 600: 'var(--brass-600)' },
        ondeep: { DEFAULT: 'var(--on-deep)', muted: 'var(--on-deep-muted)' },
        error: 'var(--error)',
        background: 'var(--bg)',
        foreground: 'var(--ink)',
        border: 'var(--line)',
        'dark-bg': 'var(--bg)',
      },
      borderRadius: {
        chip: '8px',
        card: '14px',
        panel: '20px',
      },
      boxShadow: {
        soft: 'none',
        panel: 'none',
      },
      maxWidth: {
        measure: '65ch',
        'measure-tight': '52ch',
      },
    },
  },
  plugins: [],
}
