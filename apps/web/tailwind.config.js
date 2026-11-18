/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        success: { 500: '#10B981', 600: '#059669' },
        warning: { 500: '#F59E0B', 600: '#D97706' },
        app: '#F5F3FF',
      },
      fontFamily: {
        fa: ['Vazirmatn', 'IRANSansX', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Vazirmatn', 'IRANSansX', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 24px -16px rgba(109, 40, 217, 0.25)',
        inner1: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
