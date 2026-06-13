import { View, Text, Button } from "react-native";

export default function SignUpScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Sign Up</Text>
      <Button title="Hesabım var" onPress={() => navigation.navigate("SignIn")} />
      <Button title="Kayıt Ol ve Ana Sayfaya Geç" onPress={() => navigation.replace("MainTabs")} />
    </View>
  );
}
