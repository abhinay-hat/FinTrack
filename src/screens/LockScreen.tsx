import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fingerprint } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { authenticateWithBiometric, isBiometricAvailable } from '@/services/authService';

const PIN_LENGTH = 4;
const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function LockScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const isBiometricEnabled = useSecurityStore((s) => s.isBiometricEnabled);
  const isPINEnabled = useSecurityStore((s) => s.isPINEnabled);
  const verifyPIN = useSecurityStore((s) => s.verifyPIN);
  const unlock = useSecurityStore((s) => s.unlock);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  useEffect(() => {
    if (isBiometricEnabled && biometricAvailable) {
      handleBiometric();
    }
  }, [isBiometricEnabled, biometricAvailable]);

  const handleBiometric = useCallback(async () => {
    const success = await authenticateWithBiometric();
    if (success) {
      unlock();
    }
  }, [unlock]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  useEffect(() => {
    if (pin.length === PIN_LENGTH && isPINEnabled) {
      verifyPIN(pin).then((valid) => {
        if (valid) {
          unlock();
        } else {
          setError(true);
          triggerShake();
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        }
      });
    }
  }, [pin, isPINEnabled, verifyPIN, unlock, triggerShake]);

  const onKeyPress = useCallback(
    (key: string) => {
      if (key === 'del') {
        setPin((p) => p.slice(0, -1));
        setError(false);
      } else if (key && pin.length < PIN_LENGTH) {
        setPin((p) => p + key);
      }
    },
    [pin.length],
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.navy, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }}
    >
      {/* Logo */}
      <View style={{ alignItems: 'center', marginBottom: 48 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28, color: '#FFFFFF' }}>F</Text>
        </View>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 22,
            color: '#FFFFFF',
            marginTop: 12,
          }}
        >
          FinTrack
        </Text>
      </View>

      {/* PIN dots */}
      {isPINEnabled && (
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
      )}

      <Text
        style={{
          fontFamily: 'Inter_500Medium',
          fontSize: 14,
          color: error ? colors.danger.dark : 'rgba(255,255,255,0.7)',
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        {error ? t('security.pin_mismatch') : t('security.enter_pin')}
      </Text>

      {/* Keypad */}
      {isPINEnabled && (
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
      )}

      {/* Biometric button */}
      {isBiometricEnabled && biometricAvailable && (
        <Pressable
          onPress={handleBiometric}
          style={({ pressed }) => ({
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 24,
            backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            marginTop: 16,
          })}
        >
          <Fingerprint size={24} color="#FFFFFF" />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#FFFFFF' }}>
            {t('security.biometric')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
