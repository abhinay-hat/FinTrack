import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House, ArrowsLeftRight, ChartPie, Target, GearSix } from 'phosphor-react-native';
import { colors } from '@/theme';

import HomeScreen from '@/screens/HomeScreen';
import TransactionsScreen from '@/screens/TransactionsScreen';
import ImportScreen from '@/screens/ImportScreen';
import BudgetScreen from '@/screens/BudgetScreen';
import SettingsScreen from '@/screens/SettingsScreen';

type TabParamList = {
  Home: undefined;
  Transactions: undefined;
  Import: undefined;
  Budget: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const INACTIVE_COLOR = '#94A3B8';
const ACTIVE_COLOR = colors.navy;

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.divider,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter_500Medium',
        },
        headerStyle: {
          backgroundColor: colors.white,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: colors.textPrimary.DEFAULT,
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 18,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <House size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <ArrowsLeftRight size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tab.Screen
        name="Import"
        component={ImportScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <ChartPie size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Target size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <GearSix size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
