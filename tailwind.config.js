/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      colors: {
        ink: '#17211c',
        leaf: '#21735e',
        chili: '#c2472f',
        rice: '#f8f4ec',
      },
      boxShadow: {
        lift: '0 18px 50px rgba(23, 33, 28, 0.10)',
      },
    },
  },
  plugins: [],
};
