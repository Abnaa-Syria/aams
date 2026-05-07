/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FA5103',
          hover: '#E14903',
          active: '#C84102',
          light: '#FFEEE6',
          'light-hover': '#FEE5D9',
        },
        brand: {
          primary: '#FA5103',
          hover: '#E14903',
          active: '#C84102',
          light: '#FFEEE6',
          hoverLight: '#FEE5D9',
        },
        secondary: {
          DEFAULT: '#1E293B',
          light: '#64748B',
        }
      },
      fontFamily: {
        alexandria: ['Alexandria', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'premium': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'premium-hover': '0 20px 40px rgba(0, 0, 0, 0.06)',
        'orange': '0 10px 25px rgba(250, 81, 3, 0.2)',
      }
    },
  },
  plugins: [],
}
