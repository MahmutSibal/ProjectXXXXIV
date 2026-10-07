/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'surface-container': '#edeeef',
        'on-secondary-fixed': '#241a00',
        'on-secondary': '#ffffff',
        'primary-container': '#06402b',
        'on-surface-variant': '#404943',
        tertiary: '#222222',
        'on-error-container': '#93000a',
        'surface-variant': '#e1e3e4',
        surface: '#f8f9fa',
        outline: '#717973',
        'tertiary-fixed-dim': '#c8c6c5',
        'primary-fixed': '#b8efd0',
        'on-tertiary': '#ffffff',
        'on-secondary-fixed-variant': '#574500',
        'inverse-primary': '#9cd2b5',
        'surface-tint': '#356850',
        'surface-container-high': '#e7e8e9',
        'secondary-container': '#fed65b',
        secondary: '#735c00',
        'secondary-fixed-dim': '#e9c349',
        'on-primary-container': '#77ac90',
        'on-primary': '#ffffff',
        'outline-variant': '#c0c9c1',
        'on-primary-fixed-variant': '#1b503a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-tertiary-container': '#a2a0a0',
        'on-surface': '#191c1d',
        background: '#f8f9fa',
        'tertiary-fixed': '#e5e2e1',
        'on-tertiary-fixed': '#1c1b1b',
        'inverse-on-surface': '#f0f1f2',
        error: '#ba1a1a',
        'inverse-surface': '#2e3132',
        'tertiary-container': '#383737',
        'secondary-fixed': '#ffe088',
        primary: '#002819',
        'on-secondary-container': '#745c00',
        'surface-container-low': '#f3f4f5',
        'surface-bright': '#f8f9fa',
        'primary-fixed-dim': '#9cd2b5',
        'surface-container-lowest': '#ffffff',
        'surface-container-highest': '#e1e3e4',
        'on-primary-fixed': '#002114',
        'on-background': '#191c1d',
        'on-tertiary-fixed-variant': '#474746',
        'surface-dim': '#d9dadb',
      },

      spacing: {
        xs: '4px',
        sm: '12px',
        base: '8px',
        md: '24px',
        gutter: '24px',
        lg: '40px',
        xl: '64px',
        'margin-mobile': '16px',
        'margin-desktop': '32px',
      },

      fontFamily: {
        'label-md': ['Inter', 'sans-serif'],
        'label-sm': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'headline-lg': ['Montserrat', 'sans-serif'],
        'headline-lg-mobile': ['Montserrat', 'sans-serif'],
        'headline-sm': ['Montserrat', 'sans-serif'],
        'headline-xl': ['Montserrat', 'sans-serif'],
        'headline-md': ['Montserrat', 'sans-serif'],
      },

      fontSize: {
        'label-md': [
          '14px',
          {
            lineHeight: '16px',
            letterSpacing: '0.05em',
            fontWeight: '600',
          },
        ],
        'label-sm': [
          '12px',
          {
            lineHeight: '14px',
            fontWeight: '500',
          },
        ],
        'body-lg': [
          '18px',
          {
            lineHeight: '28px',
            fontWeight: '400',
          },
        ],
        'headline-lg': [
          '32px',
          {
            lineHeight: '40px',
            letterSpacing: '-0.01em',
            fontWeight: '600',
          },
        ],
        'headline-lg-mobile': [
          '28px',
          {
            lineHeight: '36px',
            fontWeight: '600',
          },
        ],
        'body-md': [
          '16px',
          {
            lineHeight: '24px',
            fontWeight: '400',
          },
        ],
        'headline-sm': [
          '20px',
          {
            lineHeight: '28px',
            fontWeight: '600',
          },
        ],
        'body-sm': [
          '14px',
          {
            lineHeight: '20px',
            fontWeight: '400',
          },
        ],
        'headline-xl': [
          '40px',
          {
            lineHeight: '48px',
            letterSpacing: '-0.02em',
            fontWeight: '700',
          },
        ],
        'headline-md': [
          '24px',
          {
            lineHeight: '32px',
            fontWeight: '600',
          },
        ],
      },
    },
  },
  plugins: [],
};