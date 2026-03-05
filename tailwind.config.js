/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        black: {
          real: '#050505',
          soft: '#0b0b0b',
        },
        neon: {
          green: '#00ff88',
          'green-dim': 'rgba(0, 255, 136, 0.15)',
          'green-border': 'rgba(0, 255, 136, 0.25)',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0, 255, 136, 0.2)',
        'neon-soft': '0 0 12px rgba(0, 255, 136, 0.15)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
