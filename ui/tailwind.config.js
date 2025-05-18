/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#0069b4',
        accent: '#a1d9ef',
        // etc.
      },
    },
  },
  plugins: [],
}

