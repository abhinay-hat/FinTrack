import { View, Text, Pressable } from 'react-native';
import { colors } from '@/theme';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export default function EmptyState({ title, subtitle, ctaLabel, onCtaPress }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 20,
          color: colors.textPrimary.DEFAULT,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 14,
          color: colors.textSecondary.DEFAULT,
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        {subtitle}
      </Text>
      {ctaLabel && onCtaPress && (
        <Pressable
          onPress={onCtaPress}
          style={{
            backgroundColor: colors.navy,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 12,
            marginTop: 24,
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
            {ctaLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
