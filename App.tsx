import './global.css';
import '@/i18n';

import { useEffect } from 'react';
import { ActivityIndicator, AppState, View, type AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '@/db/DatabaseContext';
import { useAppStore } from '@/stores';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { detectDeviceTier } from '@/utils/deviceTier';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootNavigator from '@/navigation/RootNavigator';
import { useDatabase } from '@/hooks/useDatabase';
import Toast from 'react-native-toast-message';

function shouldLockOnResume(): boolean {
  const {
    isAppLockEnabled,
    autoLockTimeout,
    lastActiveTime,
  } = useSecurityStore.getState();
  if (!isAppLockEnabled) return false;
  // 0 means lock as soon as the app leaves the foreground / on cold start
  if (autoLockTimeout === 0) return true;
  if (lastActiveTime == null) return true;
  return Date.now() - lastActiveTime >= autoLockTimeout;
}

function AppContent() {
  const { database, isReady } = useDatabase();
  const setDeviceTier = useAppStore((s) => s.setDeviceTier);

  useEffect(() => {
    detectDeviceTier().then(setDeviceTier);
  }, [setDeviceTier]);

  // Engage app lock on cold start and when returning from background.
  useEffect(() => {
    const applyLockIfNeeded = () => {
      if (shouldLockOnResume()) {
        useSecurityStore.getState().lock();
      }
    };

    // Persist may rehydrate asynchronously; lock once current state says so,
    // and again after rehydration completes.
    applyLockIfNeeded();
    const unsub = useSecurityStore.persist.onFinishHydration(() => {
      applyLockIfNeeded();
    });

    const onAppStateChange = (next: AppStateStatus) => {
      const security = useSecurityStore.getState();
      if (!security.isAppLockEnabled) return;
      if (next === 'background' || next === 'inactive') {
        security.updateLastActive();
        if (security.autoLockTimeout === 0) {
          security.lock();
        }
      } else if (next === 'active') {
        applyLockIfNeeded();
      }
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => {
      sub.remove();
      unsub?.();
    };
  }, []);

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0A2463" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider database={database}>
        <SafeAreaProvider>
          <NavigationContainer>
            <RootNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
          <Toast />
        </SafeAreaProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0A2463" />
      </View>
    );
  }

  return <AppContent />;
}
