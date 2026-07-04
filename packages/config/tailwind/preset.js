/** @type {import('tailwindcss').Config} */
/**
 * Palette institutionnelle Eau pour Tous — Libreville.
 *
 * Tokens sémantiques :
 *   primary   → bleu institutionnel (dominant)   #1F3480 + échelle
 *   accent    → vert d'action (CTAs)              #009E60 + échelle
 *   surface   → fonds neutres                     white → #F0F4F8
 *   ink       → texte                             #0B1220 → #64748B
 *   danger    → rouge (urgence, refus)            #B91C1C
 *   gabon     → couleurs du drapeau (marque)      vert / jaune / bleu
 */
const preset = {
  theme: {
    extend: {
      colors: {
        // Bleu institutionnel — utilisation dominante
        primary: {
          DEFAULT: '#1F3480',
          50:  '#EEF1F9',
          100: '#D6DEF0',
          200: '#B7C4E4',
          300: '#8FA3D2',
          400: '#5D75B4',
          500: '#3A5199',
          600: '#1F3480',   // référence
          700: '#182765',
          800: '#111B48',
          900: '#0B1230',
        },
        // Vert — CTAs uniquement (drapeau Gabon)
        accent: {
          DEFAULT: '#009E60',
          50:  '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          500: '#10B981',
          600: '#009E60',   // référence
          700: '#047857',
          800: '#065F46',
        },
        // Fonds & bordures
        surface: {
          DEFAULT: '#FFFFFF',
          subtle:  '#F8FAFC',
          muted:   '#F0F4F8',
          raised:  '#F1F5F9',
          border:  '#E2E8F0',
        },
        // Textes
        ink: {
          DEFAULT: '#0B1220',
          soft:    '#111827',
          muted:   '#334155',
          subtle:  '#64748B',
          invert:  '#FFFFFF',
        },
        // Sémantique
        success: '#059669',
        warning: '#B45309',
        danger: {
          DEFAULT: '#B91C1C',
          soft: '#FEE2E2',
        },
        // Marque du drapeau — usage limité
        gabon: {
          green:  '#009E60',
          yellow: '#FCD116',
          blue:   '#3A75C4',
        },
      },
      fontFamily: {
        mont: ['var(--font-mont)', 'Albert Sans', 'system-ui', 'sans-serif'],
        sans: ['var(--font-mont)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-mont)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        base: ['1rem',     { lineHeight: '1.6' }],
        lg:   ['1.125rem', { lineHeight: '1.6' }],
        xl:   ['1.25rem',  { lineHeight: '1.5' }],
        '2xl':['1.5rem',   { lineHeight: '1.4' }],
        '3xl':['1.875rem', { lineHeight: '1.3' }],
        '4xl':['2.25rem',  { lineHeight: '1.2' }],
        '5xl':['3rem',     { lineHeight: '1.05' }],
        '6xl':['3.75rem',  { lineHeight: '1' }],
      },
      borderRadius: {
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15,23,42,0.04)',
        md: '0 4px 8px rgba(15,23,42,0.06)',
        lg: '0 12px 20px rgba(15,23,42,0.08)',
        xl: '0 24px 32px rgba(15,23,42,0.10)',
        focus: '0 0 0 3px rgba(0,158,96,0.35)',
      },
      minHeight: { touch: '2.75rem' },
      minWidth:  { touch: '2.75rem' },
    },
  },
};

export default preset;
