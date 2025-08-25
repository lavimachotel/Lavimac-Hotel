/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color)",
        accent: "var(--accent-color)",
        'gray-dark': "var(--gray-dark)",
        'gray-light': "var(--gray-light)"
      },
      maxWidth: {
        '7xl': '80rem',
      },
      spacing: {
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'custom': '0 0 30px rgba(0, 163, 255, 0.3)',
      }
    },
  },
  plugins: [
    function({ addVariant }) {
      // Add a custom variant for light mode
      addVariant('light', '.light &');
    },
  ],
}
