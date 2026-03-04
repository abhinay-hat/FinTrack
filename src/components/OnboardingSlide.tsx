import { View, Text, useWindowDimensions } from 'react-native';
import type { IconProps } from 'phosphor-react-native';
import { colors } from '@/theme';

interface OnboardingSlideProps {
  icon: React.ReactElement<IconProps>;
  title: string;
  subtitle: string;
}

export default function OnboardingSlide({ icon, title, subtitle }: OnboardingSlideProps) {
  const { width } = useWindowDimensions();

  return (
    <View style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <View style={{ marginBottom: 32 }}>{icon}</View>
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: 28,
          color: colors.textPrimary.DEFAULT,
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 15,
          color: colors.textSecondary.DEFAULT,
          textAlign: 'center',
          lineHeight: 22,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
