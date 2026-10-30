import type { WidgetProps } from "./ConnectlyWidget.ios";

/** Pushes fresh content to the iOS home-screen widget. Never throws. */
export function updateWidget(props: WidgetProps) {
  try {
    // Lazy: builds without the native module (or Expo Go) simply skip the widget.
    const { connectlyWidget } = require("./ConnectlyWidget.ios") as typeof import("./ConnectlyWidget.ios");
    connectlyWidget.updateSnapshot(props);
  } catch {
    // Widget extension not available in this build.
  }
}

export type { WidgetProps };
