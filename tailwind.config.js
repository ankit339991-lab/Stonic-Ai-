/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./src/index.html"
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          dark: '#030712',
          card: '#080f24',
          border: '#112244',
          cyan: '#00f3ff',
          cyanGlow: '#00d2ff',
          blue: '#0066ff',
          blueGlow: '#2575fc',
          purple: '#8a2be2',
          danger: '#ff3366',
          warning: '#ffb703',
          success: '#00ffaa',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        orbitron: ['Orbitron', 'sans-serif'],
      },
      boxShadow: {
        'cyan-glow': '0 0 15px rgba(0, 243, 255, 0.4), 0 0 30px rgba(0, 243, 255, 0.2)',
        'blue-glow': '0 0 20px rgba(0, 102, 255, 0.4), 0 0 40px rgba(0, 102, 255, 0.2)',
        'danger-glow': '0 0 15px rgba(255, 51, 102, 0.4)',
        'arc-glow': '0 0 50px rgba(0, 243, 255, 0.6), inset 0 0 30px rgba(0, 243, 255, 0.4)',
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'spin-reverse': 'spin-reverse 15s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        'spin-reverse': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.8', filter: 'drop-shadow(0 0 10px rgba(0, 243, 255, 0.6))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 25px rgba(0, 243, 255, 0.9))' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
};

