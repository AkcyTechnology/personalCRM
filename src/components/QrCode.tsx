import { View, StyleSheet } from "react-native";
import qrcode from "qrcode-generator";

type Props = {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
};

export default function QrCode({ value, size = 96, color = "#111827", backgroundColor = "#FFFFFF" }: Props) {
  const qr = qrcode(0, "M");
  qr.addData(value || " ");
  qr.make();

  const count = qr.getModuleCount();
  const cell = size / count;

  return (
    <View style={[styles.wrap, { width: size, height: size, backgroundColor }]}>
      {Array.from({ length: count }).map((_, row) => (
        <View key={row} style={{ flexDirection: "row" }}>
          {Array.from({ length: count }).map((__, col) => (
            <View
              key={col}
              style={{
                width: cell,
                height: cell,
                backgroundColor: qr.isDark(row, col) ? color : backgroundColor,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
});
