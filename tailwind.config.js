/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        navy: '#142B40', gold: '#C9A45C', ivory: '#F7F0DE', emerald: '#27685C', amethyst: '#8552BD',
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
        good: 'rgb(var(--good) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        royal: 'rgb(var(--royal) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Zodiak', 'Iowan Old Style', 'Georgia', 'serif'],
        sans: ['General Sans', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { xl: '14px', '2xl': '20px' },
      boxShadow: { card: '0 1px 2px rgb(0 0 0 / .06), 0 8px 24px -12px rgb(0 0 0 / .25)', glow: '0 0 0 1px rgb(201 164 92 / .5), 0 10px 30px -10px rgb(201 164 92 / .5)' },
    },
  },
  plugins: [],
}
