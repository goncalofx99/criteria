import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

/**
 * CRITERIA Design Tokens
 * All values reference CSS variables defined in src/index.css.
 * To change the look of the app, update the variables there — not here.
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // ── Base overrides (replace, not extend) ──────────────────────────────
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    borderRadius: {
      none: '0',
      xs: '4px',
      sm: '6px',     // chips, small tags
      DEFAULT: '8px', // inputs, small buttons
      md: '8px',
      lg: '12px',    // cards
      xl: '16px',    // large cards, sheets
      '2xl': '20px', // modals, bottom sheets
      full: '9999px', // pills, avatars
    },

    extend: {
      // ── Colors ────────────────────────────────────────────────────────
      colors: {
        // Brand greens
        primary: {
          DEFAULT: 'hsl(var(--primary))',           // #344e41
          foreground: 'hsl(var(--primary-foreground))', // #ffffff
          900: 'hsl(var(--primary-900))',           // #1a2e22
          700: 'hsl(var(--primary-700))',           // #2d4438
          600: 'hsl(var(--primary-600))',           // #52796f
          400: 'hsl(var(--primary-400))',           // #84a98c
          200: 'hsl(var(--primary-200))',           // #cad2c5
          100: 'hsl(var(--primary-100))',           // #e8ede6
        },

        // Accent (sand/warm off-white)
        accent: {
          DEFAULT: 'hsl(var(--accent))',            // #f5f0e8
          foreground: 'hsl(var(--accent-foreground))', // #344e41
          dark: 'hsl(var(--accent-dark))',          // #e8e0d0
        },

        // Surfaces & backgrounds
        background: 'hsl(var(--background))',       // #fafaf8
        surface: 'hsl(var(--surface))',             // #ffffff
        overlay: 'hsl(var(--overlay))',             // #f3f4f6

        // Borders
        border: 'hsl(var(--border))',               // #e5e7eb
        'border-strong': 'hsl(var(--border-strong))', // #d1d5db

        // Semantic
        ring: 'hsl(var(--ring))',
        foreground: 'hsl(var(--foreground))',       // #1a1a1a

        muted: {
          DEFAULT: 'hsl(var(--muted))',             // #f3f4f6
          foreground: 'hsl(var(--muted-foreground))', // #6b7280
        },

        // Status
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',       // #ef4444
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',           // #22c55e
          foreground: 'hsl(var(--success-foreground))',
          muted: 'hsl(var(--success-muted))',       // #f0fdf4
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',           // #f59e0b
          foreground: 'hsl(var(--warning-foreground))',
          muted: 'hsl(var(--warning-muted))',       // #fef3c7
        },
        info: {
          DEFAULT: 'hsl(var(--info))',              // #3b82f6
          muted: 'hsl(var(--info-muted))',          // #eff6ff
        },

        // Input specific
        input: 'hsl(var(--input))',
        'input-focus': 'hsl(var(--input-focus))',
      },

      // ── Typography ────────────────────────────────────────────────────
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.05em' }],
        xs:    ['12px', { lineHeight: '16px' }],
        sm:    ['14px', { lineHeight: '20px' }],
        base:  ['16px', { lineHeight: '24px' }],
        lg:    ['18px', { lineHeight: '28px' }],
        xl:    ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
        '4xl': ['32px', { lineHeight: '40px' }],
        display: ['36px', { lineHeight: '44px', letterSpacing: '-0.02em' }],
      },

      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0',
        wide: '0.02em',
        wider: '0.08em',
        widest: '0.15em',  // for uppercase labels
      },

      // ── Spacing ───────────────────────────────────────────────────────
      // Using Tailwind's default 4px base scale.
      // Key values: 1=4px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px, 8=32px, 10=40px, 12=48px, 16=64px

      // ── Shadows ───────────────────────────────────────────────────────
      boxShadow: {
        'elevation-1': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'elevation-2': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.04)',
        card:          '0 4px 24px 0 rgba(0,0,0,0.08)',
        'card-hover':  '0 8px 32px 0 rgba(0,0,0,0.12)',
        modal:         '0 20px 60px 0 rgba(0,0,0,0.15)',
        inner:         'inset 0 2px 4px 0 rgba(0,0,0,0.04)',
        none:          'none',
      },

      // ── Animation ─────────────────────────────────────────────────────
      transitionDuration: {
        DEFAULT: '150ms',
        fast: '100ms',
        normal: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in':       'fade-in 200ms ease-out',
        'slide-up':      'slide-up 250ms ease-out',
        'slide-in-right':'slide-in-right 200ms ease-out',
        'spin-slow':     'spin 2s linear infinite',
      },

      // ── Screens (mobile-first) ─────────────────────────────────────────
      screens: {
        xs: '390px',  // iPhone 14
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },

      // ── Max widths ─────────────────────────────────────────────────────
      maxWidth: {
        'app': '480px',   // mobile shell max width on desktop
        'content': '640px',
      },
    },
  },
  plugins: [animate],
} satisfies Config
