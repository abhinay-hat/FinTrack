import { View, Text } from 'react-native';
import { memo } from 'react';
import { getDateGroupLabel } from '@/utils';
import { formatCurrency } from '@/utils';

interface DateGroupHeaderProps {
  date: Date;
  total: number;
}

function DateGroupHeader({ date, total }: DateGroupHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-2 bg-background">
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280' }}>
        {getDateGroupLabel(date)}
      </Text>
      <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 12, color: '#6B7280' }}>
        {formatCurrency(total, true)}
      </Text>
    </View>
  );
}

export default memo(DateGroupHeader);
