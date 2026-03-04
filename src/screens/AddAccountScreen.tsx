import { View, Text, Pressable, TextInput, ScrollView, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { database } from '@/db';
import Account, { AccountType } from '@/models/Account';
import { createAccount, updateAccount, ACCOUNT_TYPE_LABELS } from '@/services/accountService';
import { colors } from '@/theme';

type RouteParams = {
  AddAccount: { accountId?: string } | undefined;
};

const ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'credit', 'cash', 'wallet'];

const TYPE_COLORS: Record<AccountType, string> = {
  checking: '#1E88E5',
  savings: '#00897B',
  credit: '#F57C00',
  cash: '#2E7D32',
  wallet: '#7B1FA2',
};

export default function AddAccountScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AddAccount'>>();
  const accountId = route.params?.accountId;
  const isEditing = !!accountId;
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('savings');
  const [institution, setInstitution] = useState('');
  const [balance, setBalance] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing account for editing
  useEffect(() => {
    if (!accountId) return;
    async function load() {
      try {
        const acc = await database.get<Account>('accounts').find(accountId!);
        setName(acc.name);
        setAccountType(acc.accountType);
        setInstitution(acc.institution ?? '');
        setBalance(acc.balance ? String(acc.balance) : '');
        setIsDefault(acc.isDefault);
      } catch (e) {
        console.error('Failed to load account:', e);
      }
    }
    load();
  }, [accountId]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Enter an account name' });
      return;
    }

    setSaving(true);
    try {
      const parsedBalance = parseFloat(balance) || 0;

      if (isEditing) {
        await updateAccount(database, accountId!, {
          name: name.trim(),
          accountType,
          institution: institution.trim() || undefined,
          balance: parsedBalance,
          isDefault,
        });
        Toast.show({ type: 'success', text1: 'Account updated' });
      } else {
        await createAccount(database, {
          name: name.trim(),
          accountType,
          institution: institution.trim() || undefined,
          balance: parsedBalance,
          isDefault,
        });
        Toast.show({ type: 'success', text1: 'Account created' });
      }
      navigation.goBack();
    } catch (e) {
      console.error('Save failed:', e);
      Toast.show({ type: 'error', text1: 'Failed to save account' });
    } finally {
      setSaving(false);
    }
  }, [name, accountType, institution, balance, isDefault, isEditing, accountId, navigation]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 pb-3 bg-white" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => navigation.goBack()} className="p-2 -ml-2" hitSlop={8}>
          <ArrowLeft size={24} color={colors.textPrimary.DEFAULT} />
        </Pressable>
        <Text
          className="flex-1 text-center"
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 18,
            color: colors.textPrimary.DEFAULT,
          }}
        >
          {isEditing ? 'Edit Account' : 'Add Account'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {/* Account Type */}
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 13,
            color: '#6B7280',
            marginBottom: 8,
            marginTop: 16,
          }}
        >
          ACCOUNT TYPE
        </Text>
        <View className="flex-row flex-wrap mb-4">
          {ACCOUNT_TYPES.map((type) => {
            const isSelected = type === accountType;
            const accent = TYPE_COLORS[type];
            return (
              <Pressable
                key={type}
                onPress={() => setAccountType(type)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  marginRight: 8,
                  marginBottom: 8,
                  backgroundColor: isSelected ? `${accent}15` : '#F0F4F8',
                  borderWidth: isSelected ? 1.5 : 0,
                  borderColor: isSelected ? accent : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    fontSize: 13,
                    color: isSelected ? accent : colors.textSecondary.DEFAULT,
                  }}
                >
                  {ACCOUNT_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Name */}
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 13,
            color: '#6B7280',
            marginBottom: 8,
          }}
        >
          ACCOUNT NAME
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={accountType === 'wallet' ? 'e.g. Paytm, PhonePe' : 'e.g. HDFC Savings'}
          placeholderTextColor="#94A3B8"
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

        {/* Institution (optional) */}
        {accountType !== 'cash' && (
          <>
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 13,
                color: '#6B7280',
                marginBottom: 8,
              }}
            >
              INSTITUTION (OPTIONAL)
            </Text>
            <TextInput
              value={institution}
              onChangeText={setInstitution}
              placeholder="e.g. HDFC Bank, SBI, ICICI"
              placeholderTextColor="#94A3B8"
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
          </>
        )}

        {/* Opening balance */}
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 13,
            color: '#6B7280',
            marginBottom: 8,
          }}
        >
          {isEditing ? 'BALANCE' : 'OPENING BALANCE'}
        </Text>
        <View className="flex-row items-center mb-4">
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 18,
              color: colors.textPrimary.DEFAULT,
              marginRight: 4,
            }}
          >
            ₹
          </Text>
          <TextInput
            value={balance}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9.]/g, '');
              setBalance(cleaned);
            }}
            placeholder="0"
            placeholderTextColor="#94A3B8"
            keyboardType="decimal-pad"
            style={{
              flex: 1,
              fontFamily: 'DMMono_500Medium',
              fontSize: 18,
              color: colors.textPrimary.DEFAULT,
              backgroundColor: '#F0F4F8',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          />
        </View>

        {/* Default toggle */}
        <View className="flex-row items-center justify-between py-3 mb-8">
          <View className="flex-1">
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 15,
                color: colors.textPrimary.DEFAULT,
              }}
            >
              Set as default
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                color: colors.textSecondary.DEFAULT,
                marginTop: 2,
              }}
            >
              New transactions use this account by default
            </Text>
          </View>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: '#E2E8F0', true: `${colors.navy}40` }}
            thumbColor={isDefault ? colors.navy : '#FFFFFF'}
          />
        </View>
      </ScrollView>

      {/* Save button */}
      <View className="px-4 pb-6 pt-2 bg-white">
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? '#94A3B8' : colors.navy,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
            {saving ? 'Saving...' : isEditing ? 'Update Account' : 'Create Account'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
