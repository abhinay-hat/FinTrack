/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary palette (Light)
        navy: '#0A2463',
        'blue-accent': {
          DEFAULT: '#1E88E5',
          dark: '#42A5F5',
        },
        teal: {
          DEFAULT: '#00897B',
          dark: '#4DB6AC',
        },
        amber: '#F57C00',
        danger: {
          DEFAULT: '#D32F2F',
          dark: '#EF5350',
        },
        purple: '#7B1FA2',

        // Text
        'text-primary': {
          DEFAULT: '#1A1A2E',
          dark: '#F1F5F9',
        },
        'text-secondary': {
          DEFAULT: '#6B7280',
          dark: '#94A3B8',
        },

        // Surfaces
        background: {
          DEFAULT: '#F0F4F8',
          dark: '#121212',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          'l1': '#1E293B',
          'l2': '#334155',
          'l3': '#475569',
        },
        divider: '#E2E8F0',

        // Category colors
        'cat-food': '#F57C00',
        'cat-transport': '#1E88E5',
        'cat-shopping': '#8E24AA',
        'cat-bills': '#D32F2F',
        'cat-entertainment': '#E91E63',
        'cat-health': '#00897B',
        'cat-education': '#1565C0',
        'cat-salary': '#2E7D32',
        'cat-investments': '#00695C',
        'cat-rent': '#5D4037',
        'cat-groceries': '#689F38',
        'cat-others': '#78909C',
      },
      fontFamily: {
        'heading': ['PlusJakartaSans_700Bold', 'System'],
        'heading-semi': ['PlusJakartaSans_600SemiBold', 'System'],
        'body': ['Inter_400Regular', 'System'],
        'body-medium': ['Inter_500Medium', 'System'],
        'body-semi': ['Inter_600SemiBold', 'System'],
        'body-bold': ['Inter_700Bold', 'System'],
        'mono': ['DMMono_500Medium', 'System'],
      },
      fontSize: {
        'display-xl': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'display-l': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'heading': ['22px', { lineHeight: '30px', fontWeight: '600' }],
        'subheading': ['17px', { lineHeight: '24px', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'amount': ['17px', { lineHeight: '24px', fontWeight: '500' }],
        'badge': ['10px', { lineHeight: '14px', fontWeight: '600' }],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
      },
    },
  },
  plugins: [],
};
