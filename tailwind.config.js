/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // NOT 'media'
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: { sans: ["Manrope", "sans-serif"] },
    },
  },
  plugins: [],
}
