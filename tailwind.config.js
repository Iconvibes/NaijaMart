/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF9900', // Jumia orange: CTAs, buttons
        secondary: '#2E2E2E', // charcoal: nav, text
        accent: '#00B517', // green: In Stock, Verified
        background: '#F5F5F5', // off-white page background
        danger: '#D32F2F', // red: discounts, sale badges
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(46,46,46,0.08)',
      },
    },
  },
  plugins: [],
}
