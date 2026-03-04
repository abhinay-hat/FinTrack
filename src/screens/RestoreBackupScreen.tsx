import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowCounterClockwise,
  CloudArrowDown,
  Eye,
  EyeSlash,
  ArrowRight,
} from 'phosphor-react-native';
import { getDocumentAsync } from 'expo-document-picker';
import { colors } from '@/theme';
import { readBackupMetadata, restoreBackup } from '@/services/backup';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Step = 'idle' | 'password' | 'preview' | 'restoring';

export default function RestoreBackupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('idle');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<{
    createdAt: string;
    transactionCount: number;
    accountCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.name?.endsWith('.fintrack')) {
        Alert.alert('Invalid File', 'Please select a .fintrack backup file.');
        return;
      }
      setFileUri(asset.uri);
      setStep('password');
    } catch {
      // cancelled
    }
  }, []);

  const handleDecrypt = useCallback(async () => {
    if (!fileUri || password.length < 4) {
      setError('Enter the backup password');
      return;
    }
    setError(null);
    try {
      const meta = await readBackupMetadata(fileUri, password);
      setPreviewMeta({
        createdAt: meta.createdAt,
        transactionCount: meta.transactionCount,
        accountCount: meta.accountCount,
      });
      setStep('preview');
    } catch {
      setError('Wrong password or corrupted backup file');
    }
  }, [fileUri, password]);

  const handleRestore = useCallback(async () => {
    if (!fileUri) return;
    Alert.alert(
      'Restore Backup',
      'This will replace all current data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setStep('restoring');
            try {
              await restoreBackup(fileUri, password, true);
              Alert.alert('Welcome Back!', 'Your data has been restored.', [
                {
                  text: 'Continue',
                  onPress: () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }),
                },
              ]);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Restore failed';
              Alert.alert('Restore Failed', msg);
              setStep('idle');
            }
          },
        },
      ],
    );
  }, [fileUri, password, navigation]);

  const resetFlow = () => {
    setStep('idle');
    setPassword('');
    setError(null);
    setFileUri(null);
    setPreviewMeta(null);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background.DEFAULT,
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
      }}
    >
      {/* Welcome header */}
      <View style={{ marginTop: 40, marginBottom: 40 }}>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 28,
            color: colors.navy,
          }}
        >
          Welcome Back
        </Text>
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 15,
            color: colors.textSecondary.DEFAULT,
            marginTop: 8,
            lineHeight: 22,
          }}
        >
          Restore your data from a previous backup, or start fresh.
        </Text>
      </View>

      {/* Restore Card */}
      <Pressable
        onPress={handlePickFile}
        style={({ pressed }) => ({
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 24,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: pressed ? 0.7 : 1,
          marginBottom: 16,
        })}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: colors.blueAccent.DEFAULT + '15',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CloudArrowDown size={28} color={colors.blueAccent.DEFAULT} weight="duotone" />
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
              color: colors.textPrimary.DEFAULT,
            }}
          >
            Restore from Backup
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              color: colors.textSecondary.DEFAULT,
              marginTop: 4,
            }}
          >
            Select a .fintrack backup file
          </Text>
        </View>
        <ArrowRight size={20} color="#94A3B8" />
      </Pressable>

      {/* Start Fresh */}
      <Pressable
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
        style={({ pressed }) => ({
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          alignItems: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 15,
            color: colors.textSecondary.DEFAULT,
          }}
        >
          Start Fresh
        </Text>
      </Pressable>

      {/* Password modal */}
      <Modal visible={step === 'password'} transparent animationType="fade">
        <Pressable
          style={overlayStyle}
          onPress={resetFlow}
        >
          <Pressable style={modalStyle} onPress={() => {}}>
            <ArrowCounterClockwise
              size={32}
              color={colors.teal.DEFAULT}
              weight="duotone"
              style={{ alignSelf: 'center', marginBottom: 12 }}
            />
            <Text style={modalTitleStyle}>Enter Backup Password</Text>
            <View style={inputWrapperStyle}>
              <TextInput
                style={inputStyle}
                placeholder="Backup password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoFocus
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                {showPassword ? (
                  <EyeSlash size={20} color="#94A3B8" />
                ) : (
                  <Eye size={20} color="#94A3B8" />
                )}
              </Pressable>
            </View>
            {error && <Text style={errorStyle}>{error}</Text>}
            <Pressable
              onPress={handleDecrypt}
              style={({ pressed }) => [primaryBtnStyle, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={primaryBtnTextStyle}>Continue</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Preview modal */}
      <Modal visible={step === 'preview'} transparent animationType="fade">
        <Pressable style={overlayStyle} onPress={resetFlow}>
          <Pressable style={modalStyle} onPress={() => {}}>
            <Text style={modalTitleStyle}>Backup Preview</Text>
            {previewMeta && (
              <View style={{ marginVertical: 12 }}>
                <MetaRow label="Created" value={new Date(previewMeta.createdAt).toLocaleString()} />
                <MetaRow label="Accounts" value={String(previewMeta.accountCount)} />
                <MetaRow label="Transactions" value={String(previewMeta.transactionCount)} />
              </View>
            )}
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                color: colors.danger.DEFAULT,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              This will replace all current data
            </Text>
            <Pressable
              onPress={handleRestore}
              style={({ pressed }) => [
                primaryBtnStyle,
                { opacity: pressed ? 0.8 : 1, backgroundColor: colors.danger.DEFAULT },
              ]}
            >
              <Text style={primaryBtnTextStyle}>Restore Backup</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Loading modal */}
      <Modal visible={step === 'restoring'} transparent animationType="fade">
        <View style={overlayStyle}>
          <View style={[modalStyle, { alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={colors.blueAccent.DEFAULT} />
            <Text style={[modalTitleStyle, { marginTop: 16 }]}>Restoring data...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textSecondary.DEFAULT }}>
        {label}
      </Text>
      <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 14, color: colors.textPrimary.DEFAULT }}>
        {value}
      </Text>
    </View>
  );
}

// ---- Styles ----
const overlayStyle = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  padding: 24,
};

const modalStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 24,
  width: '100%' as const,
  maxWidth: 360,
};

const modalTitleStyle = {
  fontFamily: 'PlusJakartaSans_600SemiBold',
  fontSize: 18,
  color: colors.textPrimary.DEFAULT,
  textAlign: 'center' as const,
} as const;

const inputWrapperStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: '#F8FAFC',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  paddingHorizontal: 14,
  marginTop: 16,
  marginBottom: 12,
};

const inputStyle = {
  flex: 1,
  fontFamily: 'Inter_400Regular',
  fontSize: 15,
  color: colors.textPrimary.DEFAULT,
  paddingVertical: 14,
} as const;

const errorStyle = {
  fontFamily: 'Inter_400Regular',
  fontSize: 12,
  color: colors.danger.DEFAULT,
  marginBottom: 8,
  textAlign: 'center' as const,
} as const;

const primaryBtnStyle = {
  backgroundColor: colors.blueAccent.DEFAULT,
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: 'center' as const,
  marginTop: 4,
};

const primaryBtnTextStyle = {
  fontFamily: 'Inter_600SemiBold',
  fontSize: 15,
  color: '#FFFFFF',
} as const;
