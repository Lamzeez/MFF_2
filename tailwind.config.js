/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#EA5410",
          50: "#FEF1E8",
          100: "#FCE0CE",
          600: "#D44808",
        },
        ink: {
          DEFAULT: "#17191D",
          2: "#4B5563",
          3: "#98A2B3",
        },
        surface: "#F4F5F7",
        card: "#FFFFFF",
        line: {
          DEFAULT: "#E7EAEF",
          2: "#F0F2F5",
        },
      },
    },
  },
  plugins: [],
}

