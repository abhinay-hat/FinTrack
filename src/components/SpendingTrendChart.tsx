import { View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { colors } from '@/theme';
import { formatCurrency } from '@/utils';

export interface DailySpending {
  day: number;
  amount: number;
}

interface SpendingTrendChartProps {
  data: DailySpending[];
  height?: number;
}

export default function SpendingTrendChart({ data, height = 180 }: SpendingTrendChartProps) {
  if (data.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary.DEFAULT }}>
          No spending data for this period
        </Text>
      </View>
    );
  }

  const PADDING_LEFT = 50;
  const PADDING_RIGHT = 16;
  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 30;
  const CHART_WIDTH = 340;
  const chartW = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartH = height - PADDING_TOP - PADDING_BOTTOM;

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const maxDay = Math.max(...data.map((d) => d.day));

  const scaleX = (day: number) => PADDING_LEFT + ((day - 1) / Math.max(maxDay - 1, 1)) * chartW;
  const scaleY = (amount: number) => PADDING_TOP + chartH - (amount / maxAmount) * chartH;

  // Build line path
  const linePoints = data.map((d) => ({ x: scaleX(d.day), y: scaleY(d.amount) }));
  const linePath = linePoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

  // Build area path (line + close at bottom)
  const areaPath =
    linePath +
    ` L ${linePoints[linePoints.length - 1]!.x} ${PADDING_TOP + chartH}` +
    ` L ${linePoints[0]!.x} ${PADDING_TOP + chartH} Z`;

  // Y-axis labels (4 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    value: maxAmount * frac,
    y: scaleY(maxAmount * frac),
  }));

  // X-axis labels (sample a few days)
  const xLabelCount = Math.min(6, maxDay);
  const xStep = Math.max(1, Math.floor(maxDay / xLabelCount));
  const xLabels: number[] = [];
  for (let d = 1; d <= maxDay; d += xStep) {
    xLabels.push(d);
  }
  if (!xLabels.includes(maxDay)) xLabels.push(maxDay);

  return (
    <View>
      <Svg width={CHART_WIDTH} height={height}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.teal.DEFAULT} stopOpacity="0.3" />
            <Stop offset="1" stopColor={colors.teal.DEFAULT} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <SvgLine
            key={i}
            x1={PADDING_LEFT}
            y1={tick.y}
            x2={CHART_WIDTH - PADDING_RIGHT}
            y2={tick.y}
            stroke="#E2E8F0"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <Path d={linePath} fill="none" stroke={colors.teal.DEFAULT} strokeWidth={2.5} strokeLinejoin="round" />

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <SvgText
            key={i}
            x={PADDING_LEFT - 6}
            y={tick.y + 4}
            textAnchor="end"
            fill={colors.textSecondary.DEFAULT}
            fontSize={10}
            fontFamily="Inter_400Regular"
          >
            {formatCurrency(tick.value, true)}
          </SvgText>
        ))}

        {/* X-axis labels */}
        {xLabels.map((day) => (
          <SvgText
            key={day}
            x={scaleX(day)}
            y={height - 6}
            textAnchor="middle"
            fill={colors.textSecondary.DEFAULT}
            fontSize={10}
            fontFamily="Inter_400Regular"
          >
            {day}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
