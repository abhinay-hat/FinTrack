import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Bank, CreditCard, Money, Wallet, Vault, DotsThreeVertical } from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { database } from '@/db';
import Account, { AccountType } from '@/models/Account';
import { deleteAccount, ACCOUNT_TYPE_LABELS } from '@/services/accountService';
import { formatCurrency } from '@/utils';
import { colors } from '@/theme';

const TYPE_COLORS: Record<AccountType, string> = {
  checking: '#1E88E5',
  savings: '#00897B',
  credit: '#F57C00',
  cash: '#2E7D32',
  wallet: '#7B1FA2',
};

const TYPE_ICONS: Record<AccountType, any> = {
  checking: Bank,
  savings: Vault,
  credit: CreditCard,
  cash: Money,
  wallet: Wallet,
};

export default function AccountsScreen() {
  const navigation = useNavigation<any>();
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const sub = database
      .get<Account>('accounts')
      .query()
      .observe()
      .subscribe(setAccounts);
    return () => sub.unsubscribe();
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const handleDelete = useCallback(async (account: Account) => {
    Alert.alert(
      'Delete Account',
      `Delete "${account.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(database, account.id);
              Toast.show({ type: 'success', text1: 'Account deleted' });
            } catch (e: any) {
              Toast.show({ type: 'error', text1: e.message });
            }
          },
        },
      ],
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Account }) => {
      const Icon = TYPE_ICONS[item.accountType] ?? Bank;
      const accentColor = TYPE_COLORS[item.accountType] ?? colors.navy;

      return (
        <Pressable
          onPress={() => navigation.navigate('AddAccount', { accountId: item.id })}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View className="flex-row items-center px-4 py-4 bg-white mb-px">
            <View
              style={{
                backgroundColor: `${accentColor}15`,
                width: 48,
                height: 48,
                borderRadius: 14,
              }}
              className="items-center justify-center mr-3"
            >
              <Icon size={24} color={accentColor} weight="duotone" />
            </View>

            <View className="flex-1 mr-3">
              <View className="flex-row items-center">
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 15,
                    color: colors.textPrimary.DEFAULT,
                  }}
                >
                  {item.name}
                </Text>
                {item.isDefault && (
                  <View
                    style={{
                      backgroundColor: `${colors.navy}15`,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 9,
                        color: colors.navy,
                      }}
                    >
                      DEFAULT
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 12,
                  color: colors.textSecondary.DEFAULT,
                  marginTop: 2,
                }}
              >
                {ACCOUNT_TYPE_LABELS[item.accountType]}
                {item.institution ? ` · ${item.institution}` : ''}
              </Text>
            </View>

            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 16,
                color: item.balance >= 0 ? colors.teal.DEFAULT : colors.danger.DEFAULT,
              }}
            >
              {formatCurrency(item.balance)}
            </Text>

            <Pressable
              onPress={() => handleDelete(item)}
              hitSlop={12}
              className="ml-2 p-1"
            >
              <DotsThreeVertical size={20} color="#94A3B8" />
            </Pressable>
          </View>
        </Pressable>
      );
    },
    [navigation, handleDelete],
  );

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-3 bg-white">
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
          Accounts
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Total balance card */}
      <View
        className="mx-4 mt-3 mb-4 p-4"
        style={{ backgroundColor: colors.navy, borderRadius: 16 }}
      >
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#94A3B8' }}>
          Total Balance
        </Text>
        <Text
          style={{
            fontFamily: 'DMMono_500Medium',
            fontSize: 28,
            color: '#FFFFFF',
            marginTop: 4,
          }}
        >
          {formatCurrency(totalBalance)}
        </Text>
        <Text
          style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8', marginTop: 4 }}
        >
          {accounts.length} account{accounts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Account list */}
      <FlatList
        data={accounts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: colors.textSecondary.DEFAULT,
              }}
            >
              No accounts yet
            </Text>
          </View>
        }
      />

      {/* Add account FAB */}
      <Pressable
        onPress={() => navigation.navigate('AddAccount')}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colors.navy,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Plus size={24} color="#FFFFFF" weight="bold" />
      </Pressable>
    </View>
  );
}
