import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        hot: 'rgb(var(--hot) / <alpha-value>)'
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
} satisfies Config
