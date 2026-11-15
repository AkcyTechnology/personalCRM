import 'react-native-gesture-handler';
import { createElement, useEffect, useState, type ComponentType } from 'react';
import { Appearance } from 'react-native';
import { registerRootComponent } from 'expo';
import * as Font from 'expo-font';
import { applyColorScheme } from './src/theme/colors';
import { loadSettings } from './src/data/userSettings';

/**
 * Screens build their StyleSheets when their module loads, so the colour scheme
 * has to be applied before App (and everything it imports) is required.
 */
function Root() {
  const [App, setApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    loadSettings()
      .then((s) => s.theme)
      .catch(() => 'system' as const)
      .then(async (pref) => {
        const scheme = pref === 'system' ? Appearance.getColorScheme() : pref;
        applyColorScheme(scheme === 'dark' ? 'dark' : 'light');
        // Instrument Sans for the People screen and tab bar; system font if it fails.
        // Only the three weights in use, so the other faces aren't bundled.
        await Font.loadAsync({
          InstrumentSans_400Regular: require('@expo-google-fonts/instrument-sans/400Regular/InstrumentSans_400Regular.ttf'),
          InstrumentSans_500Medium: require('@expo-google-fonts/instrument-sans/500Medium/InstrumentSans_500Medium.ttf'),
          InstrumentSans_600SemiBold: require('@expo-google-fonts/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf'),
        }).catch(() => {});
        setApp(() => require('./App').default as ComponentType);
      });
  }, []);

  return App ? createElement(App) : null;
}

registerRootComponent(Root);
