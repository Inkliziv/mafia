/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-red-900/30', 'bg-blue-900/30', 'bg-yellow-900/30', 'bg-green-900/30',
    'border-red-500', 'border-blue-500', 'border-yellow-500', 'border-green-500',
    'bg-red-600', 'bg-blue-600', 'bg-yellow-600', 'bg-green-600'
  ],
  theme: {
    extend: {
      colors: {
        mafia: {
          red: '#dc2626',
          darkred: '#7f1d1d',
          night: '#0f0f1a',
          card: '#1a1a2e',
          border: '#2d2d4e',
          gold: '#d4af37',
          muted: '#6b7280',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'flip': 'flip 0.6s ease-in-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        flip: {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(220, 38, 38, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(220, 38, 38, 0.8)' },
        },
      },
      backgroundImage: {
        'night-gradient': 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0d0d1f 100%)',
        'day-gradient': 'linear-gradient(135deg, #1c1410 0%, #2d1b0e 50%, #1a120a 100%)',
        'mafia-pattern': "radial-gradient(ellipse at center, rgba(127, 29, 29, 0.15) 0%, transparent 70%)",
      },
    },
  },
  plugins: [],
};
