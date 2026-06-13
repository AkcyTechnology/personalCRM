import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OnboardingScreen from "../screens/OnboardingScreen";
import SignUpScreen from "../screens/SignUpScreen";
import SignInScreen from "../screens/SignInScreen";
import MainTabs from "./MainTabs";
import AddContactScreen, { type ContactForm } from "../screens/AddContactScreen";
import PeopleScreen from "../screens/PeopleScreen";
import RemindersScreen from "../screens/RemindersScreen";
import PersonDetailScreen from "../screens/PersonDetailScreen";

export type RootStackParamList = {
  Onboarding:   undefined;
  SignUp:        undefined;
  SignIn:        undefined;
  MainTabs:      undefined;
  AddContact:    undefined;
  People:        undefined;
  Reminders:     undefined;
  PersonDetail:  { contact: ContactForm };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding"    component={OnboardingScreen} />
      <Stack.Screen name="SignUp"         component={SignUpScreen} />
      <Stack.Screen name="SignIn"         component={SignInScreen} />
      <Stack.Screen name="MainTabs"       component={MainTabs} />
      <Stack.Screen name="AddContact"     component={AddContactScreen} />
      <Stack.Screen name="People"         component={PeopleScreen} />
      <Stack.Screen name="Reminders"      component={RemindersScreen} />
      <Stack.Screen name="PersonDetail"   component={PersonDetailScreen} />
    </Stack.Navigator>
  );
}
