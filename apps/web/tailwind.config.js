/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#0f1419', light: '#1a2332', card: '#151d28' },
        accent: { DEFAULT: '#00d4aa', dim: '#00a888', red: '#ff4757', amber: '#ffa502' },
      },
    },
  },
  plugins: [],
};
