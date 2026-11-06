/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#EEF3FA',
          100: '#D5E1F2',
          200: '#A9C2E4',
          300: '#7BA0D3',
          400: '#4D7DC0',
          500: '#2A5DA3',
          600: '#1D4783',
          700: '#163766',
          800: '#10284C',
          900: '#0B1B35',
        },
        accent: {
          50: '#FFFBEB',
          100: '#FFF3C4',
          200: '#FFE58A',
          300: '#FFD34D',
          400: '#FFC62E',
          500: '#F5B400',
          600: '#D99A00',
          700: '#A87400',
          800: '#7A5300',
          900: '#4D3400',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgb(11 27 53 / 0.04), 0 8px 24px -12px rgb(11 27 53 / 0.12)',
        modal: '0 24px 64px -16px rgb(11 27 53 / 0.35)',
      },
    },
  },
  plugins: [],
};
