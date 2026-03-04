import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useCallback, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  FileCsv,
  FileXls,
  FilePdf,
  Check,
  ArrowCounterClockwise,
  CalendarBlank,
} from 'phosphor-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import {
  parseFile,
  detectColumns,
  mapRowsToTransactions,
  BANK_TEMPLATES,
} from '@/services/import';
import type { ParsedFile, ColumnMapping, ColumnRole, DetectionResult } from '@/services/import';
import { colors } from '@/theme';

const ROLE_OPTIONS: { value: ColumnRole; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'description', label: 'Description' },
  { value: 'balance', label: 'Balance' },
  { value: 'ignore', label: 'Ignore' },
];

const ROLE_COLORS: Record<ColumnRole, string> = {
  date: '#1E88E5',
  amount: '#F57C00',
  debit: '#D32F2F',
  credit: '#00897B',
  description: '#7B1FA2',
  balance: '#6B7280',
  ignore: '#CBD5E1',
};

const DATE_FORMAT_OPTIONS = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'DD MMM YYYY',
];

const PROCESSING_STEPS = [
  'Reading file...',
  'Detecting columns...',
  'Mapping data...',
];

// Bank accent colors for the logo circles
const BANK_COLORS: Record<string, string> = {
  SBI: '#1A237E',
  HDFC: '#004C8F',
  ICICI: '#F47920',
  Axis: '#97144D',
  Kotak: '#ED1C24',
  PNB: '#1B0088',
  BOB: '#F47721',
  Canara: '#FFD700',
  Union: '#003DA5',
  IndusInd: '#6A1B9A',
  Federal: '#1565C0',
  'Yes Bank': '#0066B3',
  'IDFC First': '#9C1D26',
  RBL: '#21409A',
  'AU SFB': '#EC6608',
};

type Step = 'pick' | 'processing' | 'mapping';

function AnimatedPressable({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function StatementImportScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('pick');
  const [processingStep, setProcessingStep] = useState(0);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [columns, setColumns] = useState<ColumnMapping[]>([]);
  const [autoDetectedColumns, setAutoDetectedColumns] = useState<ColumnMapping[]>([]);
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [hasSeperateDebitCredit, setHasSeperateDebitCredit] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [showDateFormatPicker, setShowDateFormatPicker] = useState(false);

  const processCSVFile = useCallback(async (bankHint: string | null) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/tab-separated-values',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setStep('processing');
      setProcessingStep(0);

      // Step 1: Reading file
      setProcessingStep(0);
      const parsed = await parseFile(asset.uri, asset.name);
      setParsedFile(parsed);

      // Step 2: Detecting columns
      setProcessingStep(1);
      const sampleRows = parsed.rows.slice(0, 10);
      const detection = detectColumns(parsed.headers, sampleRows, bankHint ?? undefined);

      // Step 3: Mapping data
      setProcessingStep(2);
      setColumns(detection.columns);
      setAutoDetectedColumns(detection.columns.map((c) => ({ ...c })));
      setDateFormat(detection.dateFormat);
      setHasSeperateDebitCredit(detection.hasSeperateDebitCredit);
      if (detection.detectedBank) setSelectedBank(detection.detectedBank);

      // Small delay so the user sees the final step
      await new Promise((r) => setTimeout(r, 400));
      setStep('mapping');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to parse file', text2: e.message });
      setStep('pick');
    }
  }, []);

  const handlePickCSV = useCallback(() => {
    processCSVFile(selectedBank);
  }, [selectedBank, processCSVFile]);

  const handlePickPDF = useCallback(() => {
    navigation.navigate('PDFImport');
  }, [navigation]);

  const handleColumnRoleChange = useCallback((index: number, newRole: ColumnRole) => {
    setColumns((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], role: newRole, confidence: 1 };
      return updated;
    });
  }, []);

  const handleResetToAutoDetected = useCallback(() => {
    setColumns(autoDetectedColumns.map((c) => ({ ...c })));
  }, [autoDetectedColumns]);

  const handleContinue = useCallback(() => {
    if (!parsedFile) return;

    const hasDate = columns.some((c) => c.role === 'date');
    const hasAmount = columns.some((c) => c.role === 'amount') ||
      (columns.some((c) => c.role === 'debit') && columns.some((c) => c.role === 'credit'));

    if (!hasDate) {
      Toast.show({ type: 'error', text1: 'Select a Date column' });
      return;
    }
    if (!hasAmount) {
      Toast.show({ type: 'error', text1: 'Select Amount or Debit/Credit columns' });
      return;
    }

    const hasSepDC = columns.some((c) => c.role === 'debit') && columns.some((c) => c.role === 'credit');
    const transactions = mapRowsToTransactions(parsedFile.rows, columns, dateFormat, hasSepDC);

    if (transactions.length === 0) {
      Toast.show({ type: 'error', text1: 'No valid transactions found' });
      return;
    }

    navigation.navigate('ImportPreview', { transactions: JSON.stringify(transactions) });
  }, [parsedFile, columns, dateFormat, navigation]);

  const confidencePercent = (c: number) => `${Math.round(c * 100)}%`;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-3 bg-white" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          onPress={() => {
            if (step === 'mapping') {
              setStep('pick');
            } else {
              navigation.goBack();
            }
          }}
          className="p-2 -ml-2"
          hitSlop={8}
        >
          <ArrowLeft size={24} color={colors.textPrimary.DEFAULT} />
        </Pressable>
        <Text
          className="flex-1 text-center"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: colors.textPrimary.DEFAULT }}
        >
          Import Statement
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Pick step */}
      {step === 'pick' && (
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Bank selector */}
          <Text
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginTop: 20, marginBottom: 10 }}
          >
            SELECT YOUR BANK (OPTIONAL)
          </Text>

          {/* Auto-detect option */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            <Pressable
              onPress={() => setSelectedBank(null)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                marginRight: 8,
                backgroundColor: selectedBank === null ? `${colors.navy}15` : '#F0F4F8',
                borderWidth: selectedBank === null ? 1.5 : 0,
                borderColor: selectedBank === null ? colors.navy : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {selectedBank === null && (
                <Check size={14} color={colors.navy} weight="bold" style={{ marginRight: 6 }} />
              )}
              <Text
                style={{
                  fontFamily: selectedBank === null ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  fontSize: 13,
                  color: selectedBank === null ? colors.navy : colors.textSecondary.DEFAULT,
                }}
              >
                Auto-detect
              </Text>
            </Pressable>

            {BANK_TEMPLATES.map((bank) => {
              const isSelected = selectedBank === bank.bankName;
              const bankColor = BANK_COLORS[bank.bankName] ?? colors.navy;
              return (
                <Pressable
                  key={bank.bankName}
                  onPress={() => setSelectedBank(isSelected ? null : bank.bankName)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginRight: 8,
                    backgroundColor: isSelected ? `${bankColor}15` : '#F0F4F8',
                    borderWidth: isSelected ? 1.5 : 0,
                    borderColor: isSelected ? bankColor : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  {/* Bank logo circle with first letter */}
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: bankColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#FFFFFF' }}>
                      {bank.bankName.charAt(0)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                      fontSize: 13,
                      color: isSelected ? bankColor : colors.textSecondary.DEFAULT,
                    }}
                  >
                    {bank.bankName}
                  </Text>
                  {isSelected && (
                    <Check size={14} color={bankColor} weight="bold" style={{ marginLeft: 6 }} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* File type cards */}
          <Text
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginBottom: 10 }}
          >
            CHOOSE FILE TYPE
          </Text>
          <View className="flex-row gap-3 mb-4">
            {/* CSV/Excel card */}
            <AnimatedPressable
              onPress={handlePickCSV}
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
                shadowColor: '#0A2463',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center mb-3">
                <FileCsv size={32} color="#00897B" weight="duotone" />
                <FileXls size={32} color="#1E88E5" weight="duotone" style={{ marginLeft: -4 }} />
              </View>
              <Text
                style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textPrimary.DEFAULT }}
              >
                CSV / Excel
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 12,
                  color: colors.textSecondary.DEFAULT,
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                .csv, .xls, .xlsx, .tsv
              </Text>
            </AnimatedPressable>

            {/* PDF card */}
            <AnimatedPressable
              onPress={handlePickPDF}
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
                shadowColor: '#0A2463',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="mb-3">
                <FilePdf size={36} color="#D32F2F" weight="duotone" />
              </View>
              <Text
                style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textPrimary.DEFAULT }}
              >
                PDF
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 12,
                  color: colors.textSecondary.DEFAULT,
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                Bank statements
              </Text>
            </AnimatedPressable>
          </View>

          {/* Supported banks info */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 16,
              marginTop: 8,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginBottom: 8 }}>
              SUPPORTED BANKS
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8', lineHeight: 20 }}>
              SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, Canara, Union, IndusInd, Federal, Yes Bank, IDFC First, RBL, AU SFB
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
              Other banks work too with auto-detection!
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Processing step */}
      {step === 'processing' && (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color={colors.navy} />
          <View className="mt-8 w-full" style={{ maxWidth: 260 }}>
            {PROCESSING_STEPS.map((label, idx) => {
              const isDone = processingStep > idx;
              const isCurrent = processingStep === idx;
              return (
                <View key={label} className="flex-row items-center mb-4">
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: isDone
                        ? `${colors.teal.DEFAULT}20`
                        : isCurrent
                        ? `${colors.navy}15`
                        : '#F0F4F8',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    {isDone ? (
                      <Check size={14} color={colors.teal.DEFAULT} weight="bold" />
                    ) : (
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 12,
                          color: isCurrent ? colors.navy : '#94A3B8',
                        }}
                      >
                        {idx + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: isCurrent ? 'Inter_600SemiBold' : 'Inter_400Regular',
                      fontSize: 14,
                      color: isDone
                        ? colors.teal.DEFAULT
                        : isCurrent
                        ? colors.textPrimary.DEFAULT
                        : '#94A3B8',
                    }}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Mapping step */}
      {step === 'mapping' && parsedFile && (
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between mt-4 mb-2">
            <View>
              <Text
                style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280' }}
              >
                COLUMN MAPPING
              </Text>
              <Text
                style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8', marginTop: 2 }}
              >
                {parsedFile.rows.length} rows detected
              </Text>
            </View>
            <Pressable
              onPress={handleResetToAutoDetected}
              className="flex-row items-center"
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: `${colors.blueAccent.DEFAULT}10`,
              }}
            >
              <ArrowCounterClockwise size={14} color={colors.blueAccent.DEFAULT} weight="bold" />
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 12,
                  color: colors.blueAccent.DEFAULT,
                  marginLeft: 4,
                }}
              >
                Reset
              </Text>
            </Pressable>
          </View>

          {/* Date format selector */}
          <Pressable
            onPress={() => setShowDateFormatPicker(!showDateFormatPicker)}
            className="flex-row items-center mb-3 p-3"
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12 }}
          >
            <CalendarBlank size={18} color={colors.blueAccent.DEFAULT} weight="duotone" />
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: colors.textPrimary.DEFAULT,
                marginLeft: 8,
                flex: 1,
              }}
            >
              Date Format
            </Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: `${ROLE_COLORS.date}15`,
              }}
            >
              <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 12, color: ROLE_COLORS.date }}>
                {dateFormat}
              </Text>
            </View>
          </Pressable>

          {showDateFormatPicker && (
            <View className="flex-row flex-wrap mb-3 gap-2">
              {DATE_FORMAT_OPTIONS.map((fmt) => (
                <Pressable
                  key={fmt}
                  onPress={() => {
                    setDateFormat(fmt);
                    setShowDateFormatPicker(false);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: dateFormat === fmt ? `${ROLE_COLORS.date}20` : '#F0F4F8',
                    borderWidth: dateFormat === fmt ? 1 : 0,
                    borderColor: ROLE_COLORS.date,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: dateFormat === fmt ? 'DMMono_500Medium' : 'Inter_400Regular',
                      fontSize: 12,
                      color: dateFormat === fmt ? ROLE_COLORS.date : '#6B7280',
                    }}
                  >
                    {fmt}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Column cards */}
          {columns.map((col) => (
            <View
              key={col.index}
              className="mb-2 p-3"
              style={{ backgroundColor: '#FFFFFF', borderRadius: 12 }}
            >
              <View className="flex-row items-center mb-2">
                <View className="flex-1 mr-3">
                  <Text
                    style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textPrimary.DEFAULT }}
                    numberOfLines={1}
                  >
                    {col.header || `Column ${col.index + 1}`}
                  </Text>
                  {parsedFile.rows[0]?.[col.index] != null && (
                    <Text
                      style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 2 }}
                      numberOfLines={1}
                    >
                      e.g. {parsedFile.rows[0][col.index]}
                    </Text>
                  )}
                </View>
                {/* Confidence badge */}
                {col.confidence > 0 && col.role !== 'ignore' && (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: col.confidence >= 0.8 ? '#00897B15' : col.confidence >= 0.5 ? '#F57C0015' : '#D32F2F15',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMMono_500Medium',
                        fontSize: 10,
                        color: col.confidence >= 0.8 ? colors.teal.DEFAULT : col.confidence >= 0.5 ? colors.amber : colors.danger.DEFAULT,
                      }}
                    >
                      {confidencePercent(col.confidence)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Role pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ROLE_OPTIONS.map((opt) => {
                  const isActive = col.role === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => handleColumnRoleChange(col.index, opt.value)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        marginRight: 6,
                        backgroundColor: isActive ? `${ROLE_COLORS[opt.value]}20` : '#F8FAFC',
                        borderWidth: isActive ? 1.5 : 1,
                        borderColor: isActive ? ROLE_COLORS[opt.value] : '#E2E8F0',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                          fontSize: 12,
                          color: isActive ? ROLE_COLORS[opt.value] : '#94A3B8',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ))}

          {/* Sample preview */}
          <Text
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginTop: 16, marginBottom: 8 }}
          >
            SAMPLE PREVIEW
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
              {/* Header row */}
              <View className="flex-row">
                {columns.filter((c) => c.role !== 'ignore').map((col) => (
                  <View
                    key={col.index}
                    style={{
                      width: 120,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      backgroundColor: `${ROLE_COLORS[col.role]}15`,
                    }}
                  >
                    <Text
                      style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: ROLE_COLORS[col.role] }}
                      numberOfLines={1}
                    >
                      {col.role.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
              {/* Data rows (first 5) */}
              {parsedFile.rows.slice(0, 5).map((row, ri) => (
                <View key={ri} className="flex-row" style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  {columns.filter((c) => c.role !== 'ignore').map((col) => (
                    <View key={col.index} style={{ width: 120, paddingHorizontal: 8, paddingVertical: 6 }}>
                      <Text
                        style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textPrimary.DEFAULT }}
                        numberOfLines={1}
                      >
                        {row[col.index] ?? ''}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Bottom actions */}
      {step === 'mapping' && (
        <View className="px-4 pb-6 pt-2 bg-white">
          <Pressable
            onPress={handleContinue}
            style={{
              backgroundColor: colors.navy,
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
              Preview Transactions
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
