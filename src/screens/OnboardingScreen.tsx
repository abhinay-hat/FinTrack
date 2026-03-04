import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Wallet, FileArrowUp, Brain } from 'phosphor-react-native';
import { colors } from '@/theme';
import { useOnboardingStore } from '@/stores';
import { database } from '@/db';
import Account from '@/models/Account';
import OnboardingSlide from '@/components/OnboardingSlide';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SLIDES = [
  {
    icon: <Wallet size={80} color={colors.navy} weight="duotone" />,
    title: 'Track Every Rupee',
    subtitle:
      'Record income, expenses, and cash transactions effortlessly. 100% offline \u2014 your data never leaves your phone.',
  },
  {
    icon: <FileArrowUp size={80} color={colors.blueAccent.DEFAULT} weight="duotone" />,
    title: 'Import Bank Statements',
    subtitle:
      'Upload CSV, Excel, or PDF statements from 15+ Indian banks. Auto-detect columns and categories.',
  },
  {
    icon: <Brain size={80} color={colors.teal.DEFAULT} weight="duotone" />,
    title: 'AI-Powered Insights',
    subtitle:
      'Get personalized spending analysis and budget recommendations. All AI runs on your device \u2014 completely private.',
  },
] as const;

interface AccountOption {
  label: string;
  type: 'savings' | 'checking' | 'cash' | 'wallet';
  name: string;
}

const ACCOUNT_OPTIONS: AccountOption[] = [
  { label: 'Savings Account', type: 'savings', name: 'Savings Account' },
  { label: 'Current Account', type: 'checking', name: 'Current Account' },
  { label: 'Cash', type: 'cash', name: 'Cash' },
  { label: 'UPI Wallet', type: 'wallet', name: 'UPI Wallet' },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const scrollRef = useRef<ScrollView>(null);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  const [currentPage, setCurrentPage] = useState(0);
  const [showAccountSetup, setShowAccountSetup] = useState(false);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / width);
      setCurrentPage(page);
    },
    [width],
  );

  const goToNext = useCallback(() => {
    if (currentPage < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentPage + 1) * width, animated: true });
    }
  }, [currentPage, width]);

  const handleSkip = useCallback(() => {
    scrollRef.current?.scrollTo({ x: (SLIDES.length - 1) * width, animated: true });
  }, [width]);

  const handleGetStarted = useCallback(() => {
    setShowAccountSetup(true);
  }, []);

  const handleAccountSelect = useCallback(
    async (option: AccountOption) => {
      await database.write(async () => {
        await database.get<Account>('accounts').create((acc) => {
          acc.name = option.name;
          acc.accountType = option.type;
          acc.balance = 0;
          acc.currency = 'INR';
          acc.isDefault = true;
        });
      });
      completeOnboarding();
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    },
    [completeOnboarding, navigation],
  );

  const handleSkipAccountSetup = useCallback(() => {
    completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  }, [completeOnboarding, navigation]);

  if (showAccountSetup) {
    return (
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        <View className="flex-1 px-6 justify-center">
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 24,
              color: colors.textPrimary.DEFAULT,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            What type of account do you use most?
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: colors.textSecondary.DEFAULT,
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            We'll create your first account to get you started.
          </Text>

          <View style={{ gap: 12 }}>
            {ACCOUNT_OPTIONS.map((option) => (
              <Pressable
                key={option.type}
                onPress={() => handleAccountSelect(option)}
                style={{
                  backgroundColor: colors.surface.DEFAULT,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.divider,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 16,
                    color: colors.textPrimary.DEFAULT,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={handleSkipAccountSetup} style={{ marginTop: 24, alignSelf: 'center' }}>
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 15,
                color: colors.textSecondary.DEFAULT,
              }}
            >
              Skip for now
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isLastSlide = currentPage === SLIDES.length - 1;

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      {/* Skip button */}
      {!isLastSlide && (
        <View className="items-end px-4" style={{ height: 44, justifyContent: 'center' }}>
          <Pressable onPress={handleSkip}>
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 15,
                color: colors.textSecondary.DEFAULT,
              }}
            >
              Skip
            </Text>
          </Pressable>
        </View>
      )}
      {isLastSlide && <View style={{ height: 44 }} />}

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {SLIDES.map((slide, index) => (
          <OnboardingSlide
            key={index}
            icon={slide.icon}
            title={slide.title}
            subtitle={slide.subtitle}
          />
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View
        className="flex-row items-center justify-center"
        style={{ gap: 8, marginBottom: 24 }}
      >
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={{
              width: index === currentPage ? 8 : 6,
              height: index === currentPage ? 8 : 6,
              borderRadius: index === currentPage ? 4 : 3,
              backgroundColor: index === currentPage ? colors.navy : colors.divider,
            }}
          />
        ))}
      </View>

      {/* Bottom button */}
      <View className="px-6">
        {isLastSlide ? (
          <Pressable
            onPress={handleGetStarted}
            style={{
              backgroundColor: colors.navy,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 16,
                color: '#FFFFFF',
              }}
            >
              Get Started
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={goToNext}
            style={{
              backgroundColor: colors.navy,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 16,
                color: '#FFFFFF',
              }}
            >
              Next
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
