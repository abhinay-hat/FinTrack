import { View, Text, Pressable } from 'react-native';
import { Wallet, ChartPie, Target, FileArrowUp, Tray } from 'phosphor-react-native';
import { colors } from '@/theme';

type EmptyStateVariant = 'transactions' | 'analytics' | 'budget' | 'import' | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  onAction?: () => void;
  /** @deprecated Use onAction instead */
  onCtaPress?: () => void;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
}

interface VariantConfig {
  icon: React.ReactElement;
  title: string;
  subtitle: string;
  ctaLabel: string;
}

const VARIANT_CONFIG: Record<EmptyStateVariant, VariantConfig> = {
  transactions: {
    icon: <Wallet size={64} color={colors.navy} weight="duotone" />,
    title: 'No transactions yet',
    subtitle: 'Add your first transaction or import a statement',
    ctaLabel: 'Add Transaction',
  },
  analytics: {
    icon: <ChartPie size={64} color={colors.blueAccent.DEFAULT} weight="duotone" />,
    title: 'Not enough data',
    subtitle: 'Add more transactions to see spending analytics',
    ctaLabel: 'Import Statement',
  },
  budget: {
    icon: <Target size={64} color={colors.teal.DEFAULT} weight="duotone" />,
    title: 'No budgets set',
    subtitle: 'Create monthly budgets to track your spending',
    ctaLabel: 'Create Budget',
  },
  import: {
    icon: <FileArrowUp size={64} color={colors.amber} weight="duotone" />,
    title: 'Import statements',
    subtitle: 'Upload bank statements to auto-import transactions',
    ctaLabel: 'Import Now',
  },
  generic: {
    icon: <Tray size={64} color={colors.textSecondary.DEFAULT} weight="duotone" />,
    title: 'Nothing here yet',
    subtitle: 'Get started by adding some data',
    ctaLabel: 'Get Started',
  },
};

export default function EmptyState({ variant = 'generic', onAction, onCtaPress, title, subtitle, ctaLabel }: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const handlePress = onAction ?? onCtaPress;

  const displayTitle = title ?? config.title;
  const displaySubtitle = subtitle ?? config.subtitle;
  const displayCtaLabel = ctaLabel ?? config.ctaLabel;

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View style={{ marginBottom: 16 }}>{config.icon}</View>
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 18,
          color: colors.textPrimary.DEFAULT,
          textAlign: 'center',
        }}
      >
        {displayTitle}
      </Text>
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 13,
          color: colors.textSecondary.DEFAULT,
          textAlign: 'center',
          marginTop: 8,
          lineHeight: 19,
        }}
      >
        {displaySubtitle}
      </Text>
      {handlePress && (
        <Pressable
          onPress={handlePress}
          style={{
            backgroundColor: colors.blueAccent.DEFAULT,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 12,
            marginTop: 24,
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
            {displayCtaLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
