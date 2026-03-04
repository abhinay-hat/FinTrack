export const colors = {
  // Primary palette (Light)
  navy: '#0A2463',
  blueAccent: { DEFAULT: '#1E88E5', dark: '#42A5F5' },
  teal: { DEFAULT: '#00897B', dark: '#4DB6AC' },
  amber: '#F57C00',
  danger: { DEFAULT: '#D32F2F', dark: '#EF5350' },
  purple: '#7B1FA2',

  // Text
  textPrimary: { DEFAULT: '#1A1A2E', dark: '#F1F5F9' },
  textSecondary: { DEFAULT: '#6B7280', dark: '#94A3B8' },

  // Surfaces — Light
  background: { DEFAULT: '#F0F4F8', dark: '#121212' },
  surface: { DEFAULT: '#FFFFFF', l1: '#1E293B', l2: '#334155', l3: '#475569' },
  divider: '#E2E8F0',

  // Category
  category: {
    food: '#F57C00',
    transport: '#1E88E5',
    shopping: '#8E24AA',
    bills: '#D32F2F',
    entertainment: '#E91E63',
    health: '#00897B',
    education: '#1565C0',
    salary: '#2E7D32',
    investments: '#00695C',
    rent: '#5D4037',
    groceries: '#689F38',
    others: '#78909C',
  },

  // Gradients (use with LinearGradient)
  gradients: {
    balanceCard: ['#0A2463', '#1E88E5'],
    incomeHighlight: ['#00897B', '#4DB6AC'],
    budgetProgress: ['#2E7D32', '#F57C00', '#D32F2F'],
  },

  white: '#FFFFFF',
  black: '#000000',
} as const;
