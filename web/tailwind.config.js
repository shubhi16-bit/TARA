/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0a0a0a',
        'brand-surface': '#171717',
        'brand-border': '#262626',
        'brand-text': '#f5f5f5',
        'brand-muted': '#a3a3a3',
        'risk-low': '#16a34a',
        'risk-mod': '#ea580c',
        'risk-high': '#dc2626',
        'risk-crit': '#991b1b',
        'primary': '#2563eb',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
