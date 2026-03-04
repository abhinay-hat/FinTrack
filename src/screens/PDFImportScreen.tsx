import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  FilePdf,
  Camera,
  Lock,
  CheckCircle,
  Warning,
  WarningCircle,
  ArrowUp,
  ArrowDown,
} from 'phosphor-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import {
  extractPDFText,
  extractPDFTextWithPassword,
  parseStatementText,
  validateWithBalance,
  scoreTransactions,
  getConfidenceSummary,
  isOCRAvailable,
} from '@/services/ocr';
import type { ScoredTransaction } from '@/services/ocr';
import { formatCurrency } from '@/utils';
import { colors } from '@/theme';

type Step = 'pick' | 'processing' | 'preview';

const CONFIDENCE_COLORS = {
  high: '#00897B',
  medium: '#F57C00',
  low: '#D32F2F',
};

export default function PDFImportScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('pick');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [transactions, setTransactions] = useState<ScoredTransaction[]>([]);
  const [summary, setSummary] = useState<ReturnType<typeof getConfidenceSummary> | null>(null);

  // Password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingFileUri, setPendingFileUri] = useState<string | null>(null);

  const processFile = useCallback(async (fileUri: string, pwd?: string) => {
    setLoading(true);
    setStep('processing');

    try {
      // Step 1: Extract text
      setLoadingMessage('Extracting text from PDF...');
      const extraction = pwd
        ? await extractPDFTextWithPassword(fileUri, pwd)
        : await extractPDFText(fileUri);

      if (extraction.needsOCR) {
        if (isOCRAvailable()) {
          Toast.show({
            type: 'info',
            text1: 'Scanned PDF detected',
            text2: 'Running OCR...',
          });
          // TODO: Run OCR pipeline when dev client is available
        } else {
          Toast.show({
            type: 'error',
            text1: 'Scanned PDF detected',
            text2: 'OCR requires a development build. Use CSV import instead.',
          });
          setStep('pick');
          setLoading(false);
          return;
        }
      }

      // Step 2: Parse structured data
      setLoadingMessage('Parsing transactions...');
      const parsed = parseStatementText(extraction.fullText);

      // Step 3: Validate with balance cross-check
      setLoadingMessage('Validating amounts...');
      const validated = validateWithBalance(parsed.rows);

      // Step 4: Score confidence
      setLoadingMessage('Scoring confidence...');
      const scored = scoreTransactions(validated);
      const stats = getConfidenceSummary(scored);

      setTransactions(scored);
      setSummary(stats);
      setStep('preview');

      if (scored.length === 0) {
        Toast.show({
          type: 'error',
          text1: 'No transactions found',
          text2: 'The PDF may not contain a recognizable statement format.',
        });
        setStep('pick');
      }
    } catch (e: any) {
      if (e.message?.includes('encrypted') || e.message?.includes('password')) {
        setPendingFileUri(fileUri);
        setShowPasswordDialog(true);
        setStep('pick');
      } else {
        Toast.show({ type: 'error', text1: 'Failed to process PDF', text2: e.message });
        setStep('pick');
      }
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, []);

  const handlePickPDF = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      await processFile(result.assets[0].uri);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to pick file', text2: e.message });
    }
  }, [processFile]);

  const handlePasswordSubmit = useCallback(async () => {
    if (!pendingFileUri || !password) return;
    setShowPasswordDialog(false);
    const pwd = password;
    setPassword(''); // Clear from state immediately
    await processFile(pendingFileUri, pwd);
    setPendingFileUri(null);
  }, [pendingFileUri, password, processFile]);

  const handleContinueToImport = useCallback(() => {
    // Convert scored transactions to ParsedTransaction format for ImportPreview
    const importReady = transactions.map((t) => ({
      date: t.date,
      amount: t.amount,
      type: t.type,
      description: t.description,
      balance: t.balance ?? undefined,
      rawRow: [t.rawText],
    }));
    navigation.navigate('ImportPreview', { transactions: JSON.stringify(importReady) });
  }, [transactions, navigation]);

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-3 bg-white" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => navigation.goBack()} className="p-2 -ml-2" hitSlop={8}>
          <ArrowLeft size={24} color={colors.textPrimary.DEFAULT} />
        </Pressable>
        <Text
          className="flex-1 text-center"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: colors.textPrimary.DEFAULT }}
        >
          PDF Import
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Pick step */}
      {step === 'pick' && !loading && (
        <ScrollView className="flex-1 px-4">
          <Pressable
            onPress={handlePickPDF}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#E2E8F0',
              borderStyle: 'dashed',
              paddingVertical: 48,
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <FilePdf size={48} color="#D32F2F" weight="duotone" />
            <Text
              style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary.DEFAULT, marginTop: 16 }}
            >
              Select PDF Statement
            </Text>
            <Text
              style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary.DEFAULT, marginTop: 8 }}
            >
              Supports password-protected PDFs
            </Text>
          </Pressable>

          {/* Camera capture option */}
          <Pressable
            onPress={() => {
              if (isOCRAvailable()) {
                // TODO: Navigate to camera capture screen
                Toast.show({ type: 'info', text1: 'Camera capture coming soon' });
              } else {
                Toast.show({
                  type: 'info',
                  text1: 'Camera OCR requires dev build',
                  text2: 'Use PDF or CSV import instead',
                });
              }
            }}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 16,
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Camera size={24} color={colors.blueAccent.DEFAULT} weight="duotone" />
            <View className="flex-1 ml-3">
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textPrimary.DEFAULT }}>
                Scan with Camera
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary.DEFAULT, marginTop: 2 }}>
                {isOCRAvailable() ? 'On-device OCR — no internet needed' : 'Requires development build'}
              </Text>
            </View>
          </Pressable>

          {/* Info */}
          <View className="mt-6 px-2">
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginBottom: 8 }}>
              SUPPORTED BANKS
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8', lineHeight: 20 }}>
              SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, Canara, Union, IndusInd, Federal, Yes Bank, IDFC First, RBL, AU SFB
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Processing step */}
      {step === 'processing' && (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color={colors.navy} />
          <Text
            style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textPrimary.DEFAULT, marginTop: 20 }}
          >
            {loadingMessage || 'Processing...'}
          </Text>
        </View>
      )}

      {/* Preview step with confidence indicators */}
      {step === 'preview' && summary && (
        <>
          <ScrollView className="flex-1 px-4">
            {/* Confidence summary */}
            <View className="mt-3 p-4" style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary.DEFAULT, marginBottom: 8 }}>
                Extraction Quality
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1 items-center">
                  <View className="flex-row items-center">
                    <CheckCircle size={16} color={CONFIDENCE_COLORS.high} weight="fill" />
                    <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 18, color: CONFIDENCE_COLORS.high, marginLeft: 4 }}>
                      {summary.high}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>High</Text>
                </View>
                <View className="flex-1 items-center">
                  <View className="flex-row items-center">
                    <Warning size={16} color={CONFIDENCE_COLORS.medium} weight="fill" />
                    <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 18, color: CONFIDENCE_COLORS.medium, marginLeft: 4 }}>
                      {summary.medium}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>Review</Text>
                </View>
                <View className="flex-1 items-center">
                  <View className="flex-row items-center">
                    <WarningCircle size={16} color={CONFIDENCE_COLORS.low} weight="fill" />
                    <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 18, color: CONFIDENCE_COLORS.low, marginLeft: 4 }}>
                      {summary.low}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>Low</Text>
                </View>
              </View>
            </View>

            {/* Transaction list with confidence */}
            <Text
              style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginTop: 16, marginBottom: 8 }}
            >
              {transactions.length} TRANSACTIONS FOUND
            </Text>

            {transactions.map((txn, idx) => {
              const isExpense = txn.type === 'expense';
              const confColor = CONFIDENCE_COLORS[txn.confidenceLevel];

              return (
                <View
                  key={idx}
                  className="mb-2 p-3"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    borderLeftWidth: 3,
                    borderLeftColor: confColor,
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: isExpense ? '#D32F2F10' : '#00897B10',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                      }}
                    >
                      {isExpense
                        ? <ArrowUp size={16} color={colors.danger.DEFAULT} weight="bold" />
                        : <ArrowDown size={16} color={colors.teal.DEFAULT} weight="bold" />}
                    </View>
                    <View className="flex-1">
                      <Text
                        style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary.DEFAULT }}
                        numberOfLines={1}
                      >
                        {txn.description}
                      </Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                        {txn.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: 'DMMono_500Medium',
                        fontSize: 14,
                        color: isExpense ? colors.danger.DEFAULT : colors.teal.DEFAULT,
                      }}
                    >
                      {isExpense ? '-' : '+'}{formatCurrency(txn.amount)}
                    </Text>
                  </View>
                  {txn.flags.length > 0 && (
                    <View className="flex-row flex-wrap mt-2 ml-11">
                      {txn.flags.map((flag, fi) => (
                        <View
                          key={fi}
                          style={{
                            backgroundColor: `${confColor}15`,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            marginRight: 4,
                            marginBottom: 4,
                          }}
                        >
                          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: confColor }}>
                            {flag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Continue button */}
          <View className="px-4 pb-6 pt-2 bg-white">
            <Pressable
              onPress={handleContinueToImport}
              style={{
                backgroundColor: colors.navy,
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
                Continue to Import
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Password dialog */}
      <Modal visible={showPasswordDialog} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => {
            setShowPasswordDialog(false);
            setPassword('');
            setPendingFileUri(null);
          }}
        >
          <Pressable
            style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '85%' }}
            onPress={() => {}} // prevent close
          >
            <View className="items-center mb-4">
              <Lock size={32} color={colors.navy} weight="duotone" />
            </View>
            <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, color: colors.textPrimary.DEFAULT, textAlign: 'center' }}>
              Password Protected
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary.DEFAULT, textAlign: 'center', marginTop: 8, marginBottom: 16 }}>
              Enter the password to open this PDF. Common passwords: DOB (DDMMYYYY), last 4 digits of account number.
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              autoFocus
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                color: colors.textPrimary.DEFAULT,
                backgroundColor: '#F0F4F8',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginBottom: 16,
              }}
            />
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setShowPasswordDialog(false);
                  setPassword('');
                  setPendingFileUri(null);
                }}
                className="flex-1 items-center py-3"
                style={{ borderRadius: 12, backgroundColor: '#F0F4F8' }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textSecondary.DEFAULT }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handlePasswordSubmit}
                className="flex-1 items-center py-3"
                style={{ borderRadius: 12, backgroundColor: colors.navy }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: '#FFFFFF' }}>
                  Unlock
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
