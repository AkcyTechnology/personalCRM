import { HStack, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { containerBackground, font, foregroundStyle, lineLimit, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export type WidgetProps = {
  /** Already translated in the app: the widget runtime has no i18n. */
  title: string;
  stage: string;
  emoji: string;
  week: string;
  person: string;
  prompt: string;
  dark: boolean;
};

/**
 * Home-screen widget. The function body is serialised by the expo-widgets Babel
 * plugin and runs inside the widget extension, so it may only use its props and
 * the SwiftUI globals — no closures over app code.
 */
const ConnectlyWidgetLayout = (props: WidgetProps, env: WidgetEnvironment) => {
  "widget";
  const bg = props.dark ? "#0E1416" : "#F4FBFA";
  const ink = props.dark ? "#F1F5F4" : "#111827";
  const sub = props.dark ? "#A9B4B8" : "#4B5563";
  const accent = props.dark ? "#FF8A70" : "#C2410C";
  const small = env.widgetFamily === "systemSmall";
  return (
    <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 2 }), containerBackground(bg, "widget")]}>
      <HStack spacing={6}>
        <Text modifiers={[font({ size: small ? 28 : 32 })]}>{props.emoji}</Text>
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 11, weight: "bold" }), foregroundStyle(accent), lineLimit(1)]}>{props.title}</Text>
          <Text modifiers={[font({ size: 15, weight: "heavy" }), foregroundStyle(ink), lineLimit(1)]}>{props.stage}</Text>
        </VStack>
        <Spacer />
      </HStack>
      <Text modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle(sub), lineLimit(1)]}>{props.week}</Text>
      <Spacer />
      {props.person ? (
        <VStack alignment="leading" spacing={1}>
          <Text modifiers={[font({ size: small ? 15 : 17, weight: "bold" }), foregroundStyle(ink), lineLimit(1)]}>{props.person}</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(sub), lineLimit(small ? 2 : 1)]}>{props.prompt}</Text>
        </VStack>
      ) : (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(sub), lineLimit(2)]}>{props.prompt}</Text>
      )}
    </VStack>
  );
};

export const connectlyWidget = createWidget<WidgetProps>("ConnectlyWidget", ConnectlyWidgetLayout);
