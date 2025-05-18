/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: "#0069b4",
        accent: "#a1d9ef",
        danger: "#cd1222",
        warn:   "#e6733c",
        ok:     "#15882e",
        surface:"#ffffff",
        text:   "#1a1a1a",
      },
    },
  },
  plugins: [],
}

