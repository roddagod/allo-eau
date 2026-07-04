import type { Config } from 'tailwindcss';

/**
 * Tokens sémantiques de la Plateforme Eau Libreville.
 * Dupliqués depuis `@eaupourtous/config/tailwind` pour garantir la génération
 * (Webpack ne watch pas correctement les symlinks vers les workspace packages).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F3480',
          50:  '#EEF1F9',
          100: '#D6DEF0',
          200: '#B7C4E4',
          300: '#8FA3D2',
          400: '#5D75B4',
          500: '#3A5199',
          600: '#1F3480',
          700: '#182765',
          800: '#111B48',
          900: '#0B1230',
        },
        accent: {
          DEFAULT: '#009E60',
          50:  '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          500: '#10B981',
          600: '#009E60',
          700: '#047857',
          800: '#065F46',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle:  '#F8FAFC',
          muted:   '#F0F4F8',
          raised:  '#F1F5F9',
          border:  '#E2E8F0',
        },
        ink: {
          DEFAULT: '#0B1220',
          soft:    '#111827',
          muted:   '#334155',
          subtle:  '#64748B',
          invert:  '#FFFFFF',
        },
        success: '#059669',
        warning: '#B45309',
        danger: {
          DEFAULT: '#B91C1C',
          soft:    '#FEE2E2',
        },
        gabon: {
          green:  '#009E60',
          yellow: '#FCD116',
          blue:   '#3A75C4',
        },
      },
      fontFamily: {
        mont:    ['var(--font-mont)', 'Albert Sans', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-mont)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-mont)', 'system-ui', 'sans-serif'],
      },
      minHeight: { touch: '2.75rem' },
      minWidth:  { touch: '2.75rem' },
      boxShadow: {
        focus: '0 0 0 3px rgba(0,158,96,0.35)',
      },
    },
  },
};

export default config;
