// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        customBlack: "#0B0B0B",
        customWhite: "#F5F5F5",
        customRed: "#FF4500", // or #FFD700 for a gold feel
        customGray: "#B0B0B0",
        ecoGreen: "#228B22",
        ecoGold: "#FFD700",
      },
    },
  },
  plugins: [],
}
