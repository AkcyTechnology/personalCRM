import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ToastHost from './src/components/Toast';
import CelebrationHost from './src/components/Celebration';
import AppLock from './src/app/AppLock';
import LanguageGate from './src/app/LanguageGate';
import ReminderSync from './src/app/ReminderSync';
import WidgetSync from './src/app/WidgetSync';
import { navigationRef } from './src/navigation/navigationRef';
import { colors, colorScheme } from './src/theme/colors';

const base = colorScheme() === 'dark' ? DarkTheme : DefaultTheme;
const navTheme: Theme = {
  ...base,
  colors: { ...base.colors, primary: colors.primary, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppLock>
          <LanguageGate>
            <NavigationContainer ref={navigationRef} theme={navTheme}>
              <StatusBar style={colorScheme() === 'dark' ? 'light' : 'dark'} />
              <RootNavigator />
              <ReminderSync />
              <WidgetSync />
              <CelebrationHost />
              <ToastHost />
            </NavigationContainer>
          </LanguageGate>
        </AppLock>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
