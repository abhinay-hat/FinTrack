import { TextStyle } from 'react-native';

export const typography = {
  displayXl: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  displayL: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  heading: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  subheading: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    fontFamily: 'Inter_400Regular',
  },
  bodySm: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    fontFamily: 'Inter_400Regular',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  amount: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    fontFamily: 'DMMono_500Medium',
  },
  badge: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
} as const satisfies Record<string, TextStyle>;
