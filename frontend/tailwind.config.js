/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pine: {
          DEFAULT: '#2F4B37',
          dark: '#20331F',
          light: '#3E6249'
        },
        paper: '#F5F1E7',
        ink: '#1E241D',
        marigold: {
          DEFAULT: '#C98A1F',
          light: '#E4A83C'
        },
        brick: '#B4432E',
        stone: '#8A8272'
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 0 rgba(30,36,29,0.06)'
      }
    }
  },
  plugins: []
};
