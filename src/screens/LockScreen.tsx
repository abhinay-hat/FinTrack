import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fingerprint } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { authenticateWithBiometric, isBiometricAvailable } from '@/services/authService';

const PIN_LENGTH = 4;
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function LockScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const isBiometricEnabled = useSecurityStore((s) => s.isBiometricEnabled);
  const isPINEnabled = useSecurityStore((s) => s.isPINEnabled);
  const verifyPIN = useSecurityStore((s) => s.verifyPIN);
  const unlock = useSecurityStore((s) => s.unlock);

  const lockedOut = now < lockoutUntil;
  const lockoutSecondsLeft = lockedOut
    ? Math.ceil((lockoutUntil - now) / 1000)
    : 0;

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  useEffect(() => {
    if (!lockedOut) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockedOut]);

  useEffect(() => {
    if (isBiometricEnabled && biometricAvailable && !lockedOut) {
      handleBiometric();
    }
  }, [isBiometricEnabled, biometricAvailable, lockedOut]);

  const handleBiometric = useCallback(async () => {
    if (Date.now() < lockoutUntil) return;
    const success = await authenticateWithBiometric();
    if (success) {
      setFailedAttempts(0);
      unlock();
    }
  }, [unlock, lockoutUntil]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH || !isPINEnabled) return;
    if (Date.now() < lockoutUntil) {
      setPin('');
      return;
    }
    verifyPIN(pin).then((valid) => {
      if (valid) {
        setFailedAttempts(0);
        unlock();
      } else {
        setError(true);
        triggerShake();
        setFailedAttempts((prev) => {
          const next = prev + 1;
          if (next >= MAX_PIN_ATTEMPTS) {
            setLockoutUntil(Date.now() + LOCKOUT_MS);
            return 0;
          }
          return next;
        });
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      }
    });
  }, [pin, isPINEnabled, verifyPIN, unlock, triggerShake, lockoutUntil]);

  const onKeyPress = useCallback(
    (key: string) => {
      if (Date.now() < lockoutUntil) return;
      if (key === 'del') {
        setPin((p) => p.slice(0, -1));
        setError(false);
      } else if (key && pin.length < PIN_LENGTH) {
        setPin((p) => p + key);
      }
    },
    [pin.length, lockoutUntil],
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
          color: lockedOut || error ? colors.danger.dark : 'rgba(255,255,255,0.7)',
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        {lockedOut
          ? `Too many attempts. Try again in ${lockoutSecondsLeft}s`
          : error
            ? t('security.pin_mismatch')
            : t('security.enter_pin')}
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
                    opacity: lockedOut && key !== '' ? 0.4 : 1,
                  })}
                  disabled={key === '' || lockedOut}
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
