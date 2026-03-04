import { View, Text, Pressable, ScrollView } from 'react-native';
import { colors } from '@/theme';
import { ACCOUNT_TYPE_LABELS } from '@/services/accountService';
import type { AccountType } from '@/models/Account';

export interface AccountItem {
  id: string;
  name: string;
  accountType: AccountType;
  balance: number;
}

interface AccountSelectorProps {
  accounts: AccountItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TYPE_COLORS: Record<AccountType, string> = {
  checking: '#1E88E5',
  savings: '#00897B',
  credit: '#F57C00',
  cash: '#2E7D32',
  wallet: '#7B1FA2',
};

export default function AccountSelector({ accounts, selectedId, onSelect }: AccountSelectorProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
      {accounts.map((acc) => {
        const isSelected = acc.id === selectedId;
        const accentColor = TYPE_COLORS[acc.accountType] ?? colors.navy;

        return (
          <Pressable
            key={acc.id}
            onPress={() => onSelect(acc.id)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              marginRight: 8,
              backgroundColor: isSelected ? `${accentColor}15` : '#F0F4F8',
              borderWidth: isSelected ? 1.5 : 0,
              borderColor: isSelected ? accentColor : 'transparent',
            }}
          >
            <Text
              style={{
                fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                fontSize: 13,
                color: isSelected ? accentColor : colors.textSecondary.DEFAULT,
              }}
            >
              {acc.name}
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 11,
                color: colors.textSecondary.DEFAULT,
                marginTop: 2,
              }}
            >
              {ACCOUNT_TYPE_LABELS[acc.accountType]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
