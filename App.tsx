import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ToastHost from './src/components/Toast';
import AppLock from './src/app/AppLock';
import ReminderSync from './src/app/ReminderSync';
import { navigationRef } from './src/navigation/navigationRef';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppLock>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
            <ReminderSync />
            <ToastHost />
          </NavigationContainer>
        </AppLock>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
