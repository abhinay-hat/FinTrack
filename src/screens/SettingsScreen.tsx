import { View, Text, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bank, CaretRight, Info, FileArrowUp } from 'phosphor-react-native';
import { colors } from '@/theme';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function SettingsRow({ icon, label, onPress }: SettingsRowProps) {
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
      <CaretRight size={18} color="#94A3B8" />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

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
          Settings
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Accounts section */}
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 13,
            color: '#6B7280',
            marginLeft: 16,
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          ACCOUNTS
        </Text>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 16 }}>
          <SettingsRow
            icon={<Bank size={22} color={colors.blueAccent.DEFAULT} weight="duotone" />}
            label="Manage Accounts"
            onPress={() => navigation.navigate('Accounts')}
          />
          <View style={{ height: 1, backgroundColor: '#F1F5F9', marginLeft: 46 }} />
          <SettingsRow
            icon={<FileArrowUp size={22} color={colors.teal.DEFAULT} weight="duotone" />}
            label="Import Statement"
            onPress={() => navigation.navigate('StatementImport')}
          />
        </View>

        {/* App section */}
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
          APP
        </Text>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 16 }}>
          <SettingsRow
            icon={<Info size={22} color={colors.textSecondary.DEFAULT} weight="duotone" />}
            label="About FinTrack"
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
          }}
        >
          FinTrack v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}
