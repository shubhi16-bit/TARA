/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-dark': 'var(--brand-dark)',
        'brand-surface': 'var(--brand-surface)',
        'brand-border': 'var(--brand-border)',
        'brand-text': 'var(--brand-text)',
        'brand-muted': 'var(--brand-muted)',
        'risk-low': 'var(--risk-low)',
        'risk-mod': 'var(--risk-mod)',
        'risk-high': 'var(--risk-high)',
        'risk-crit': 'var(--risk-crit)',
        'primary': 'var(--primary)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
