import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Shield,
  ArrowCounterClockwise,
  CloudArrowUp,
  Info,
  ShareNetwork,
  Eye,
  EyeSlash,
} from 'phosphor-react-native';
import { shareAsync } from 'expo-sharing';
import { getDocumentAsync } from 'expo-document-picker';
import { colors } from '@/theme';
import { createBackup, readBackupMetadata, restoreBackup } from '@/services/backup';
import { useBackupStore } from '@/stores/useBackupStore';
import {
  isEncryptionAvailable,
  getEncryptionStatus,
} from '@/services/encryption/encryptionStub';

type Step = 'idle' | 'password' | 'creating' | 'created' | 'picking' | 'restore_password' | 'preview' | 'restoring';

export default function BackupSettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { lastBackupDate, autoBackupEnabled, setLastBackupDate, setAutoBackup } =
    useBackupStore();

  const [step, setStep] = useState<Step>('idle');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [backupUri, setBackupUri] = useState<string | null>(null);
  const [restoreUri, setRestoreUri] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{
    createdAt: string;
    transactionCount: number;
    accountCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---- Create Backup Flow ----
  const handleCreateBackup = useCallback(async () => {
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setStep('creating');
    try {
      const uri = await createBackup(password);
      setBackupUri(uri);
      setLastBackupDate(new Date().toISOString());
      setStep('created');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create backup';
      Alert.alert('Backup Failed', msg);
      setStep('idle');
    }
    setPassword('');
    setConfirmPassword('');
  }, [password, confirmPassword, setLastBackupDate]);

  const handleShare = useCallback(async () => {
    if (!backupUri) return;
    try {
      await shareAsync(backupUri, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Save your FinTrack backup',
      });
    } catch {
      // user cancelled
    }
    setStep('idle');
    setBackupUri(null);
  }, [backupUri]);

  // ---- Restore Flow ----
  const handlePickFile = useCallback(async () => {
    try {
      const result = await getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.name?.endsWith('.fintrack')) {
        Alert.alert('Invalid File', 'Please select a .fintrack backup file.');
        return;
      }
      setRestoreUri(asset.uri);
      setStep('restore_password');
    } catch {
      // cancelled
    }
  }, []);

  const handleRestorePreview = useCallback(async () => {
    if (!restoreUri || password.length < 4) {
      setError('Enter the backup password');
      return;
    }
    setError(null);
    try {
      const meta = await readBackupMetadata(restoreUri, password);
      setPreviewMeta({
        createdAt: meta.createdAt,
        transactionCount: meta.transactionCount,
        accountCount: meta.accountCount,
      });
      setStep('preview');
    } catch {
      setError('Wrong password or corrupted backup file');
    }
  }, [restoreUri, password]);

  const handleConfirmRestore = useCallback(async () => {
    if (!restoreUri) return;
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
              await restoreBackup(restoreUri, password, true);
              Alert.alert('Success', 'Your data has been restored.');
              setStep('idle');
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Restore failed';
              Alert.alert('Restore Failed', msg);
              setStep('idle');
            }
            setPassword('');
            setRestoreUri(null);
            setPreviewMeta(null);
          },
        },
      ],
    );
  }, [restoreUri, password]);

  const resetFlow = () => {
    setStep('idle');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setBackupUri(null);
    setRestoreUri(null);
    setPreviewMeta(null);
  };

  const isLoading = step === 'creating' || step === 'restoring';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.DEFAULT }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: '#FFFFFF',
          paddingTop: insets.top + 8,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.textPrimary.DEFAULT} />
        </Pressable>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 18,
            color: colors.textPrimary.DEFAULT,
            flex: 1,
            textAlign: 'center',
            marginRight: 24,
          }}
        >
          Backup & Restore
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Create Backup */}
        <Text style={sectionLabelStyle}>CREATE BACKUP</Text>
        <Pressable
          onPress={() => setStep('password')}
          style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Shield size={28} color={colors.blueAccent.DEFAULT} weight="duotone" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={cardTitleStyle}>Create Backup</Text>
            <Text style={cardSubtitleStyle}>
              Encrypt and export your data as a .fintrack file
            </Text>
          </View>
        </Pressable>

        {lastBackupDate && (
          <Text style={lastBackupStyle}>
            Last backup: {new Date(lastBackupDate).toLocaleString()}
          </Text>
        )}

        {/* Restore Backup */}
        <Text style={sectionLabelStyle}>RESTORE BACKUP</Text>
        <Pressable
          onPress={handlePickFile}
          style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ArrowCounterClockwise size={28} color={colors.teal.DEFAULT} weight="duotone" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={cardTitleStyle}>Restore from Backup</Text>
            <Text style={cardSubtitleStyle}>
              Select a .fintrack file to restore your data
            </Text>
          </View>
        </Pressable>

        {/* Cloud Info */}
        <Text style={sectionLabelStyle}>ABOUT BACKUPS</Text>
        <View style={[cardStyle, { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <CloudArrowUp size={22} color={colors.blueAccent.DEFAULT} weight="duotone" />
            <Text style={[cardTitleStyle, { marginLeft: 10 }]}>Your backup, your storage</Text>
          </View>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary.DEFAULT, lineHeight: 20 }}>
            FinTrack doesn't have its own cloud. Your backup is a file you can save
            anywhere — Google Drive, iCloud, email, USB.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <Info size={14} color={colors.textSecondary.DEFAULT} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textSecondary.DEFAULT, marginLeft: 6 }}>
              {isEncryptionAvailable()
                ? 'Database encryption is active'
                : getEncryptionStatus()}
            </Text>
          </View>
        </View>

        {/* Auto-backup toggle */}
        <Text style={sectionLabelStyle}>AUTO-BACKUP</Text>
        <View style={[cardStyle, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={cardTitleStyle}>Auto-backup reminder</Text>
            <Text style={cardSubtitleStyle}>Get reminded to backup periodically</Text>
          </View>
          <Switch
            value={autoBackupEnabled}
            onValueChange={setAutoBackup}
            trackColor={{ false: '#E2E8F0', true: colors.blueAccent.DEFAULT }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>

      {/* Password Modal for Create */}
      <Modal visible={step === 'password'} transparent animationType="fade">
        <Pressable
          style={overlayStyle}
          onPress={resetFlow}
        >
          <Pressable style={modalStyle} onPress={() => {}}>
            <Text style={modalTitleStyle}>Set Backup Password</Text>
            <Text style={modalSubtitleStyle}>
              This password encrypts your backup. You'll need it to restore.
            </Text>
            <View style={inputWrapperStyle}>
              <TextInput
                style={inputStyle}
                placeholder="Password"
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
            <View style={inputWrapperStyle}>
              <TextInput
                style={inputStyle}
                placeholder="Confirm password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
            {error && <Text style={errorStyle}>{error}</Text>}
            <Pressable
              onPress={handleCreateBackup}
              style={({ pressed }) => [primaryBtnStyle, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={primaryBtnTextStyle}>Create Backup</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Creating / Restoring loader */}
      <Modal visible={isLoading} transparent animationType="fade">
        <View style={overlayStyle}>
          <View style={[modalStyle, { alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={colors.blueAccent.DEFAULT} />
            <Text style={[modalTitleStyle, { marginTop: 16 }]}>
              {step === 'creating' ? 'Creating backup...' : 'Restoring data...'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Created — Share */}
      <Modal visible={step === 'created'} transparent animationType="fade">
        <Pressable style={overlayStyle} onPress={resetFlow}>
          <Pressable style={modalStyle} onPress={() => {}}>
            <Text style={modalTitleStyle}>Backup Created</Text>
            <Text style={modalSubtitleStyle}>
              Your encrypted backup is ready. Share it to save it somewhere safe.
            </Text>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [primaryBtnStyle, { opacity: pressed ? 0.8 : 1, flexDirection: 'row', justifyContent: 'center' }]}
            >
              <ShareNetwork size={18} color="#FFFFFF" weight="bold" style={{ marginRight: 8 }} />
              <Text style={primaryBtnTextStyle}>Share Backup File</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Restore password modal */}
      <Modal visible={step === 'restore_password'} transparent animationType="fade">
        <Pressable style={overlayStyle} onPress={resetFlow}>
          <Pressable style={modalStyle} onPress={() => {}}>
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
              onPress={handleRestorePreview}
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
              onPress={handleConfirmRestore}
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
const sectionLabelStyle = {
  fontFamily: 'Inter_600SemiBold',
  fontSize: 13,
  color: '#6B7280',
  marginLeft: 16,
  marginTop: 24,
  marginBottom: 8,
} as const;

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  marginHorizontal: 16,
  padding: 16,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
};

const cardTitleStyle = {
  fontFamily: 'Inter_600SemiBold',
  fontSize: 15,
  color: colors.textPrimary.DEFAULT,
} as const;

const cardSubtitleStyle = {
  fontFamily: 'Inter_400Regular',
  fontSize: 12,
  color: colors.textSecondary.DEFAULT,
  marginTop: 2,
} as const;

const lastBackupStyle = {
  fontFamily: 'Inter_400Regular',
  fontSize: 12,
  color: colors.textSecondary.DEFAULT,
  marginLeft: 32,
  marginTop: 6,
} as const;

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

const modalSubtitleStyle = {
  fontFamily: 'Inter_400Regular',
  fontSize: 13,
  color: colors.textSecondary.DEFAULT,
  textAlign: 'center' as const,
  marginTop: 8,
  marginBottom: 16,
} as const;

const inputWrapperStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: '#F8FAFC',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  paddingHorizontal: 14,
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
