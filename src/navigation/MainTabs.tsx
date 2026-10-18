import { useState } from "react";
import { View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootNavigator";
import HomeScreen from "../screens/HomeScreen";
import PeopleScreen from "../screens/PeopleScreen";
import ProfileScreen from "../screens/ProfileScreen";
import UniverseScreen from "../screens/UniverseScreen";
import BottomTabBar from "../components/BottomTabBar";
import { colors } from "../theme/colors";

type Tab = "Home" | "People" | "Insights" | "Profile";

type Props = NativeStackScreenProps<RootStackParamList, "MainTabs">;

function ActiveScreen({ tab, navigation }: { tab: Tab; navigation: Props["navigation"] }) {
  switch (tab) {
    case "Home":     return <HomeScreen navigation={navigation} />;
    case "People":   return <PeopleScreen navigation={navigation} />;
    case "Insights": return <UniverseScreen navigation={navigation} />;
    case "Profile":  return <ProfileScreen navigation={navigation} />;
  }
}

export default function MainTabs({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Home");

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        <ActiveScreen tab={activeTab} navigation={navigation} />
      </View>
      <BottomTabBar
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onAddPress={() => navigation.navigate("AddContact")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  screen: {
    flex: 1,
  },
});
