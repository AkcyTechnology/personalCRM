import 'react-native-gesture-handler';
import { createElement, useEffect, useState, type ComponentType } from 'react';
import { Appearance } from 'react-native';
import { registerRootComponent } from 'expo';
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
      .then((pref) => {
        const scheme = pref === 'system' ? Appearance.getColorScheme() : pref;
        applyColorScheme(scheme === 'dark' ? 'dark' : 'light');
        setApp(() => require('./App').default as ComponentType);
      });
  }, []);

  return App ? createElement(App) : null;
}

registerRootComponent(Root);
