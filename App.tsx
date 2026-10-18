import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ToastHost from './src/components/Toast';
import CelebrationHost from './src/components/Celebration';
import AppLock from './src/app/AppLock';
import LanguageGate from './src/app/LanguageGate';
import ReminderSync from './src/app/ReminderSync';
import { navigationRef } from './src/navigation/navigationRef';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppLock>
          <LanguageGate>
            <NavigationContainer ref={navigationRef}>
              <RootNavigator />
              <ReminderSync />
              <CelebrationHost />
              <ToastHost />
            </NavigationContainer>
          </LanguageGate>
        </AppLock>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
