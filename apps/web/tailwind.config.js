/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          strong: 'rgb(var(--brand-strong) / <alpha-value>)',
          soft: 'rgb(var(--brand-soft) / <alpha-value>)',
        },
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        hairline: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        subtle: 'rgb(var(--text-muted) / <alpha-value>)',
        soft: 'rgb(var(--text-soft) / <alpha-value>)',
        cash: {
          DEFAULT: 'rgb(var(--cash) / <alpha-value>)',
          soft: 'rgb(var(--cash-soft) / <alpha-value>)',
        },
        gift: {
          DEFAULT: 'rgb(var(--gift) / <alpha-value>)',
          soft: 'rgb(var(--gift-soft) / <alpha-value>)',
        },
        cashback: {
          DEFAULT: 'rgb(var(--cashback) / <alpha-value>)',
          soft: 'rgb(var(--cashback-soft) / <alpha-value>)',
        },
        corporate: {
          DEFAULT: 'rgb(var(--corporate) / <alpha-value>)',
          soft: 'rgb(var(--corporate-soft) / <alpha-value>)',
        },
        card: {
          src: 'rgb(var(--card-src) / <alpha-value>)',
          'src-soft': 'rgb(var(--card-src-soft) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          soft: 'rgb(var(--success-soft) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          soft: 'rgb(var(--danger-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          soft: 'rgb(var(--warning-soft) / <alpha-value>)',
        },
      },
      fontFamily: {
        fa: ['Vazirmatn', 'IRANSansX', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Vazirmatn', 'IRANSansX', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        hero: ['3rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
