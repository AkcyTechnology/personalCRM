/** The home-screen widget is iOS-only for now (expo-widgets' Android support is experimental). */
export type WidgetProps = {
  title: string;
  stage: string;
  emoji: string;
  week: string;
  person: string;
  prompt: string;
  dark: boolean;
};

export function updateWidget(_props: WidgetProps) {}
