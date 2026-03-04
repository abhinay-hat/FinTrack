import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileArrowUp, FileCsv, FileXls } from 'phosphor-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import {
  parseFile,
  detectColumns,
  mapRowsToTransactions,
  BANK_TEMPLATES,
} from '@/services/import';
import type { ParsedFile, ColumnMapping, ColumnRole, ParsedTransaction } from '@/services/import';
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

type Step = 'pick' | 'mapping' | 'processing';

export default function StatementImportScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('pick');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [columns, setColumns] = useState<ColumnMapping[]>([]);
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [hasSeperateDebitCredit, setHasSeperateDebitCredit] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickFile = useCallback(async () => {
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
      setLoading(true);

      const parsed = await parseFile(asset.uri, asset.name);
      setParsedFile(parsed);

      // Auto-detect columns
      const sampleRows = parsed.rows.slice(0, 10);
      const detection = detectColumns(parsed.headers, sampleRows, selectedBank ?? undefined);
      setColumns(detection.columns);
      setDateFormat(detection.dateFormat);
      setHasSeperateDebitCredit(detection.hasSeperateDebitCredit);
      if (detection.detectedBank) setSelectedBank(detection.detectedBank);

      setStep('mapping');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to parse file', text2: e.message });
    } finally {
      setLoading(false);
    }
  }, [selectedBank]);

  const handleColumnRoleChange = useCallback((index: number, newRole: ColumnRole) => {
    setColumns((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], role: newRole, confidence: 1 };
      return updated;
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (!parsedFile) return;

    // Validate: need at least date + (amount or debit/credit) + description
    const hasDate = columns.some((c) => c.role === 'date');
    const hasAmount = columns.some((c) => c.role === 'amount') ||
      (columns.some((c) => c.role === 'debit') && columns.some((c) => c.role === 'credit'));
    const hasDesc = columns.some((c) => c.role === 'description');

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
          Import Statement
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {step === 'pick' && (
        <ScrollView className="flex-1 px-4">
          {/* Bank selector */}
          <Text
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginTop: 20, marginBottom: 8 }}
          >
            SELECT YOUR BANK (OPTIONAL)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            {BANK_TEMPLATES.map((bank) => (
              <Pressable
                key={bank.bankName}
                onPress={() => setSelectedBank(selectedBank === bank.bankName ? null : bank.bankName)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  marginRight: 8,
                  backgroundColor: selectedBank === bank.bankName ? `${colors.navy}15` : '#F0F4F8',
                  borderWidth: selectedBank === bank.bankName ? 1.5 : 0,
                  borderColor: selectedBank === bank.bankName ? colors.navy : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: selectedBank === bank.bankName ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    fontSize: 13,
                    color: selectedBank === bank.bankName ? colors.navy : colors.textSecondary.DEFAULT,
                  }}
                >
                  {bank.bankName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* File picker */}
          <Pressable
            onPress={handlePickFile}
            disabled={loading}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#E2E8F0',
              borderStyle: 'dashed',
              paddingVertical: 48,
              alignItems: 'center',
            }}
          >
            {loading ? (
              <ActivityIndicator size="large" color={colors.navy} />
            ) : (
              <>
                <FileArrowUp size={48} color={colors.blueAccent.DEFAULT} weight="duotone" />
                <Text
                  style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary.DEFAULT, marginTop: 16 }}
                >
                  Pick a Statement File
                </Text>
                <Text
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary.DEFAULT, marginTop: 8 }}
                >
                  CSV, XLS, XLSX supported
                </Text>
              </>
            )}
          </Pressable>

          {/* Supported formats */}
          <View className="flex-row items-center justify-center mt-6 gap-6">
            <View className="items-center">
              <FileCsv size={28} color="#00897B" weight="duotone" />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280', marginTop: 4 }}>CSV</Text>
            </View>
            <View className="items-center">
              <FileXls size={28} color="#1E88E5" weight="duotone" />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280', marginTop: 4 }}>Excel</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {step === 'mapping' && parsedFile && (
        <ScrollView className="flex-1 px-4">
          <Text
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginTop: 16, marginBottom: 4 }}
          >
            COLUMN MAPPING
          </Text>
          <Text
            style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8', marginBottom: 12 }}
          >
            {parsedFile.rows.length} rows detected · Tap a role to change it
          </Text>

          {columns.map((col) => (
            <View
              key={col.index}
              className="flex-row items-center mb-2 p-3"
              style={{ backgroundColor: '#FFFFFF', borderRadius: 12 }}
            >
              <View className="flex-1 mr-3">
                <Text
                  style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textPrimary.DEFAULT }}
                  numberOfLines={1}
                >
                  {col.header || `Column ${col.index + 1}`}
                </Text>
                {parsedFile.rows[0]?.[col.index] && (
                  <Text
                    style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 2 }}
                    numberOfLines={1}
                  >
                    e.g. {parsedFile.rows[0][col.index]}
                  </Text>
                )}
              </View>

              {/* Role selector - simple pill toggle */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 200 }}>
                {ROLE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleColumnRoleChange(col.index, opt.value)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      marginRight: 4,
                      backgroundColor: col.role === opt.value ? `${ROLE_COLORS[opt.value]}20` : '#F8FAFC',
                      borderWidth: col.role === opt.value ? 1 : 0,
                      borderColor: ROLE_COLORS[opt.value],
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: col.role === opt.value ? 'Inter_600SemiBold' : 'Inter_400Regular',
                        fontSize: 11,
                        color: col.role === opt.value ? ROLE_COLORS[opt.value] : '#94A3B8',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
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
            <View>
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
