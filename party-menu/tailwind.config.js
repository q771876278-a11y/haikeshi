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
        ink: '#201915',
        leaf: '#28745e',
        tomato: '#d44c31',
        rice: '#fff7ec',
      },
      boxShadow: {
        lift: '0 20px 48px rgba(32, 25, 21, 0.14)',
        drawer: '0 -18px 42px rgba(32, 25, 21, 0.18)',
      },
    },
  },
  plugins: [],
};
