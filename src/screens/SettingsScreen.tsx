import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bank,
  CaretRight,
  Info,
  FileArrowUp,
  Lock,
  Fingerprint,
  NumberSquareOne,
  Timer,
  Globe,
} from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import { useAppStore } from '@/stores';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { isBiometricAvailable } from '@/services/authService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  right?: React.ReactNode;
}

function SettingsRow({ icon, label, onPress, right }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-4"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {icon}
      <Text
        style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textPrimary.DEFAULT, flex: 1, marginLeft: 12 }}
      >
        {label}
      </Text>
      {right ?? <CaretRight size={18} color="#94A3B8" />}
    </Pressable>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 16,
        marginTop: 24,
        marginBottom: 8,
      }}
    >
      {text}
    </Text>
  );
}

const AUTO_LOCK_OPTIONS = [
  { label: 'immediately', value: 0 },
  { label: 'after_30s', value: 30000 },
  { label: 'after_1m', value: 60000 },
  { label: 'after_5m', value: 300000 },
] as const;

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const {
    isAppLockEnabled,
    isBiometricEnabled,
    isPINEnabled,
    autoLockTimeout,
    enableAppLock,
    disableAppLock,
    setBiometric,
    clearPIN,
    setAutoLockTimeout,
  } = useSecurityStore();

  const [hasBiometric, setHasBiometric] = useState(false);
  const [showAutoLock, setShowAutoLock] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setHasBiometric);
  }, []);

  const handleLanguageToggle = () => {
    const newLang = language === 'en' ? 'hi' : 'en';
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  const handleAppLockToggle = (value: boolean) => {
    if (value) {
      enableAppLock();
    } else {
      disableAppLock();
    }
  };

  const handleBiometricToggle = (value: boolean) => {
    setBiometric(value);
  };

  const handlePINToggle = (value: boolean) => {
    if (value) {
      navigation.navigate('PINSetup');
    } else {
      clearPIN();
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pb-3 bg-white" style={{ paddingTop: insets.top + 8 }}>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 18,
            color: colors.textPrimary.DEFAULT,
            textAlign: 'center',
          }}
        >
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Accounts section */}
        <SectionLabel text={t('settings.accounts').toUpperCase()} />
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 16 }}>
          <SettingsRow
            icon={<Bank size={22} color={colors.blueAccent.DEFAULT} weight="duotone" />}
            label={t('settings.accounts')}
            onPress={() => navigation.navigate('Accounts')}
          />
          <View style={{ height: 1, backgroundColor: '#F1F5F9', marginLeft: 46 }} />
          <SettingsRow
            icon={<FileArrowUp size={22} color={colors.teal.DEFAULT} weight="duotone" />}
            label={t('settings.import')}
            onPress={() => navigation.navigate('StatementImport')}
          />
        </View>

        {/* Security section */}
        <SectionLabel text={t('settings.security').toUpperCase()} />
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 16 }}>
          <SettingsRow
            icon={<Lock size={22} color={colors.navy} weight="duotone" />}
            label={t('settings.app_lock')}
            onPress={() => {}}
            right={
              <Switch
                value={isAppLockEnabled}
                onValueChange={handleAppLockToggle}
                trackColor={{ false: '#E2E8F0', true: colors.blueAccent.DEFAULT }}
                thumbColor="#FFFFFF"
              />
            }
          />

          {isAppLockEnabled && (
            <>
              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginLeft: 46 }} />
              {hasBiometric && (
                <>
                  <SettingsRow
                    icon={<Fingerprint size={22} color={colors.teal.DEFAULT} weight="duotone" />}
                    label={t('settings.biometric')}
                    onPress={() => {}}
                    right={
                      <Switch
                        value={isBiometricEnabled}
                        onValueChange={handleBiometricToggle}
                        trackColor={{ false: '#E2E8F0', true: colors.blueAccent.DEFAULT }}
                        thumbColor="#FFFFFF"
                      />
                    }
                  />
                  <View style={{ height: 1, backgroundColor: '#F1F5F9', marginLeft: 46 }} />
                </>
              )}
              <SettingsRow
                icon={<NumberSquareOne size={22} color={colors.amber} weight="duotone" />}
                label={t('settings.pin_lock')}
                onPress={() => {}}
                right={
                  <Switch
                    value={isPINEnabled}
                    onValueChange={handlePINToggle}
                    trackColor={{ false: '#E2E8F0', true: colors.blueAccent.DEFAULT }}
                    thumbColor="#FFFFFF"
                  />
                }
              />
              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginLeft: 46 }} />
              <SettingsRow
                icon={<Timer size={22} color={colors.textSecondary.DEFAULT} weight="duotone" />}
                label={t('security.auto_lock')}
                onPress={() => setShowAutoLock((v) => !v)}
                right={
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary.DEFAULT }}>
                    {t(`security.${AUTO_LOCK_OPTIONS.find((o) => o.value === autoLockTimeout)?.label ?? 'immediately'}`)}
                  </Text>
                }
              />
              {showAutoLock && (
                <View style={{ paddingLeft: 46, paddingRight: 16, paddingBottom: 12 }}>
                  {AUTO_LOCK_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setAutoLockTimeout(option.value);
                        setShowAutoLock(false);
                      }}
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor:
                          autoLockTimeout === option.value
                            ? colors.blueAccent.DEFAULT + '15'
                            : pressed
                              ? '#F1F5F9'
                              : 'transparent',
                      })}
                    >
                      <Text
                        style={{
                          fontFamily: autoLockTimeout === option.value ? 'Inter_600SemiBold' : 'Inter_400Regular',
                          fontSize: 14,
                          color:
                            autoLockTimeout === option.value ? colors.blueAccent.DEFAULT : colors.textPrimary.DEFAULT,
                        }}
                      >
                        {t(`security.${option.label}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Language section */}
        <SectionLabel text={t('settings.language').toUpperCase()} />
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 16 }}>
          <SettingsRow
            icon={<Globe size={22} color={colors.purple} weight="duotone" />}
            label={t('settings.language')}
            onPress={handleLanguageToggle}
            right={
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.blueAccent.DEFAULT }}>
                {language === 'en' ? 'English' : 'हिंदी'}
              </Text>
            }
          />
        </View>

        {/* App section */}
        <SectionLabel text="APP" />
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 16 }}>
          <SettingsRow
            icon={<Info size={22} color={colors.textSecondary.DEFAULT} weight="duotone" />}
            label={t('settings.about')}
            onPress={() => {}}
          />
        </View>

        {/* Version */}
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 12,
            color: '#94A3B8',
            textAlign: 'center',
            marginTop: 32,
            marginBottom: 32,
          }}
        >
          FinTrack v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}
