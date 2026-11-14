import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AVATARS } from "../data/avatars";
import { colors } from "../theme/colors";
import { t } from "../i18n";

type Props = {
  visible: boolean;
  /** Currently chosen id, if any. */
  value?: string;
  onClose: () => void;
  /** undefined = no illustration (neutral icon). */
  onSelect: (id: string | undefined) => void;
};

type Item = { id: string | undefined; label: string };

/** "Avatar seç" sheet: the illustrated set plus a neutral option. */
export default function AvatarPicker({ visible, value, onClose, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const columns = width < 360 ? 4 : 5;
  const cell = Math.floor((Math.min(width, 520) - 40 - (columns - 1) * 10) / columns);
  const items: Item[] = [{ id: undefined, label: t("Simge yok") }, ...AVATARS.map((a) => ({ id: a.id, label: t(a.label) }))];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t("Kapat")} accessibilityRole="button">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title} accessibilityRole="header">{t("Avatar seç")}</Text>
          <Text style={styles.sub}>{t("Fotoğraf yerine görünecek çizimi seç. İstediğin zaman değiştirebilirsin.")}</Text>
          <FlatList
            data={items}
            key={columns}
            numColumns={columns}
            keyExtractor={(it) => it.id ?? "none"}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
            renderItem={({ item }) => {
              const selected = item.id === value;
              const source = AVATARS.find((a) => a.id === item.id)?.source;
              return (
                <TouchableOpacity
                  onPress={() => onSelect(item.id)}
                  style={[styles.cell, { width: cell, height: cell, borderRadius: cell / 2 }, selected && styles.cellSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={item.label}
                >
                  {source ? (
                    <Image source={source} style={{ width: cell - 8, height: cell - 8, borderRadius: (cell - 8) / 2 }} />
                  ) : (
                    <View style={[styles.none, { width: cell - 8, height: cell - 8, borderRadius: (cell - 8) / 2 }]}>
                      <Ionicons name="person" size={Math.round(cell * 0.38)} color={colors.textMuted} />
                    </View>
                  )}
                  {selected ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={14} color={colors.onFill} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity style={styles.close} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeText}>{t("Kapat")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, maxHeight: "85%" },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.textSub, marginTop: 4, marginBottom: 14 },
  cell: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  cellSelected: { borderColor: colors.primary },
  none: { alignItems: "center", justifyContent: "center", backgroundColor: colors.borderLight },
  check: {
    position: "absolute", right: 0, bottom: 0, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  close: { marginTop: 10, minHeight: 48, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 15, fontWeight: "700", color: colors.textSub },
});
