/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand:  "#0069b4",
        accent: "#16bae7",
        danger: "#cd1222",
        warn:   "#e6733c",
        ok:     "#15882e",
      },
    },
  },
  plugins: [],
};

