import { View, Text, Button } from "react-native";

export default function SignInScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Sign In</Text>
      <Button title="Giriş Yap" onPress={() => navigation.replace("MainTabs")} />
    </View>
  );
}
