/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#131722',   // TradingView main background
          panel: '#1E222D', // TradingView panel background
          border: '#2A2E39', // TradingView border
          text: '#D1D4DC',   // TradingView light text
          textMuted: '#787B86', // TradingView muted text
        },
        primary: {
          blue: '#2962FF',   // TradingView primary blue
          green: '#089981',  // Up color
          red: '#F23645',    // Down color
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
