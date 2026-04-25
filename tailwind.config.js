/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0A0706',
          secondary: '#141010',
          tertiary: '#1C1816',
        },
        orange: {
          DEFAULT: '#FF6B1F',
          hover: '#FF7A35',
          muted: '#C2531A',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          emphasis: 'rgba(255, 255, 255, 0.15)',
        },
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Syne', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        hero: ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1.02', letterSpacing: '-0.03em', fontWeight: '900' }],
        display: ['clamp(2rem, 3.5vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '800' }],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)',
        'orange-glow': '0 0 40px rgba(255, 107, 31, 0.35)',
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255, 107, 31, 0.18), transparent 70%)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.4s linear infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'breathe': {
          '0%, 100%': { boxShadow: '0 0 0 rgba(255,107,31,0.0), 0 0 30px rgba(255,107,31,0.35)' },
          '50%':      { boxShadow: '0 0 0 rgba(255,107,31,0.0), 0 0 50px rgba(255,107,31,0.55)' },
        },
      },
    },
  },
  plugins: [],
};
