import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import { useSecurityStore } from '@/stores/useSecurityStore';

const PIN_LENGTH = 4;
const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

type Step = 'enter' | 'confirm';

export default function PINSetupScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const setPINStore = useSecurityStore((s) => s.setPIN);

  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handlePinComplete = useCallback(
    async (enteredPin: string) => {
      if (step === 'enter') {
        setFirstPin(enteredPin);
        setPin('');
        setStep('confirm');
      } else {
        if (enteredPin === firstPin) {
          await setPINStore(enteredPin);
          navigation.goBack();
        } else {
          setError(true);
          triggerShake();
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        }
      }
    },
    [step, firstPin, setPINStore, navigation, triggerShake],
  );

  const onKeyPress = useCallback(
    (key: string) => {
      if (key === 'del') {
        setPin((p) => p.slice(0, -1));
        setError(false);
      } else if (key && pin.length < PIN_LENGTH) {
        const newPin = pin + key;
        setPin(newPin);
        if (newPin.length === PIN_LENGTH) {
          handlePinComplete(newPin);
        }
      }
    },
    [pin, handlePinComplete],
  );

  const title = step === 'enter' ? t('security.set_pin') : t('security.confirm_pin');

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.navy, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}
    >
      {/* Header */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={{ padding: 16 }}
      >
        <ArrowLeft size={24} color="#FFFFFF" />
      </Pressable>

      {/* Title */}
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 22,
          color: '#FFFFFF',
          textAlign: 'center',
          marginTop: 24,
          marginBottom: 32,
        }}
      >
        {title}
      </Text>

      {/* PIN dots */}
      <Animated.View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 12,
          transform: [{ translateX: shakeAnim }],
        }}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: i < pin.length ? '#FFFFFF' : 'transparent',
              borderWidth: 2,
              borderColor: error ? colors.danger.DEFAULT : '#FFFFFF',
            }}
          />
        ))}
      </Animated.View>

      {error && (
        <Text
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 14,
            color: colors.danger.dark,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {t('security.pin_mismatch')}
        </Text>
      )}

      <View style={{ flex: 1 }} />

      {/* Keypad */}
      <View style={{ paddingHorizontal: 48 }}>
        {[0, 1, 2, 3].map((row) => (
          <View key={row} style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
            {KEYPAD.slice(row * 3, row * 3 + 3).map((key, idx) => (
              <Pressable
                key={idx}
                onPress={() => key !== '' && onKeyPress(key)}
                style={({ pressed }) => ({
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: key === '' ? 'transparent' : pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: 12,
                })}
                disabled={key === ''}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: key === 'del' ? 14 : 24,
                    color: '#FFFFFF',
                  }}
                >
                  {key === 'del' ? '⌫' : key}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
