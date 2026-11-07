/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#D9A441",
          navy: "#1B2A4A",
        },
      },
    },
  },
  plugins: [],
};
