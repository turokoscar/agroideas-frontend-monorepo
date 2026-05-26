/**
 * @agroideas/theme — Preset Tailwind compartido (MIDAGRI / INIA).
 *
 * Consume las variables CSS de `styles/tokens.css` mediante `hsl(var(--x) / <alpha>)`,
 * de modo que el color real vive en un único lugar (themeable por app vía override
 * de variables CSS). No contiene valores hex de marca hardcodeados.
 *
 * Uso en una app:
 *   // apps/<app>/tailwind.config.js
 *   const preset = require('../../libs/theme/src/tailwind-preset.js');
 *   module.exports = { presets: [preset], content: [...] };
 */
const hsl = (v) => `hsl(var(${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: hsl('--border'),
        input: hsl('--input'),
        ring: hsl('--ring'),
        background: hsl('--background'),
        foreground: hsl('--foreground'),
        'on-surface': hsl('--on-surface'),
        'on-surface-variant': hsl('--on-surface-variant'),
        'outline-variant': hsl('--outline-variant'),

        primary: {
          DEFAULT: hsl('--primary'),
          foreground: hsl('--primary-foreground'),
          container: hsl('--primary-container'),
          'on-container': hsl('--on-primary-container'),
        },
        secondary: {
          DEFAULT: hsl('--secondary'),
          foreground: hsl('--secondary-foreground'),
          container: hsl('--secondary-container'),
          'on-container': hsl('--on-secondary-container'),
        },
        tertiary: {
          DEFAULT: hsl('--tertiary'),
          foreground: hsl('--tertiary-foreground'),
          container: hsl('--tertiary-container'),
          'on-container': hsl('--on-tertiary-container'),
        },
        accent: {
          DEFAULT: hsl('--accent'),
          foreground: hsl('--accent-foreground'),
        },
        muted: {
          DEFAULT: hsl('--muted'),
          foreground: hsl('--muted-foreground'),
        },
        destructive: {
          DEFAULT: hsl('--destructive'),
          foreground: hsl('--destructive-foreground'),
        },
        success: {
          DEFAULT: hsl('--success'),
          soft: hsl('--success-soft'),
          foreground: hsl('--success-foreground'),
        },
        warning: {
          DEFAULT: hsl('--warning'),
          soft: hsl('--warning-soft'),
          foreground: hsl('--warning-foreground'),
        },
        danger: {
          DEFAULT: hsl('--danger'),
          soft: hsl('--danger-soft'),
          foreground: hsl('--danger-foreground'),
        },
        info: {
          DEFAULT: hsl('--info'),
          soft: hsl('--info-soft'),
          foreground: hsl('--info-foreground'),
        },
        card: {
          DEFAULT: hsl('--card'),
          foreground: hsl('--card-foreground'),
        },
        popover: {
          DEFAULT: hsl('--popover'),
          foreground: hsl('--popover-foreground'),
        },
        surface: {
          DEFAULT: hsl('--surface'),
          'container-lowest': hsl('--surface-container-lowest'),
          'container-low': hsl('--surface-container-low'),
          container: hsl('--surface-container'),
          'container-high': hsl('--surface-container-high'),
          'container-highest': hsl('--surface-container-highest'),
          50: hsl('--surface-50'),
          100: hsl('--surface-100'),
          200: hsl('--surface-200'),
          300: hsl('--surface-300'),
          400: hsl('--surface-400'),
          500: hsl('--surface-500'),
          600: hsl('--surface-600'),
          700: hsl('--surface-700'),
          800: hsl('--surface-800'),
          900: hsl('--surface-900'),
        },
        sidebar: {
          DEFAULT: hsl('--sidebar-background'),
          foreground: hsl('--sidebar-foreground'),
          primary: hsl('--sidebar-primary'),
          'primary-foreground': hsl('--sidebar-primary-foreground'),
          accent: hsl('--sidebar-accent'),
          'accent-foreground': hsl('--sidebar-accent-foreground'),
          border: hsl('--sidebar-border'),
          ring: hsl('--sidebar-ring'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ["'Roboto'", 'system-ui', 'sans-serif'],
        display: ["'Roboto'", 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        premium:
          '0 10px 30px -5px rgba(52, 107, 0, 0.1), 0 8px 20px -6px rgba(0, 0, 0, 0.05)',
        'premium-hover':
          '0 20px 40px -12px rgba(52, 107, 0, 0.2), 0 12px 24px -8px rgba(0, 0, 0, 0.1)',
        card: '0 4px 20px -2px rgba(26, 28, 28, 0.04), 0 2px 10px -2px rgba(26, 28, 28, 0.02)',
        pill: '0 2px 8px -1px rgba(52, 107, 0, 0.15)',
        ambient: '0 20px 40px -12px rgba(26, 28, 28, 0.04)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
};
