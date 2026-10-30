import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OnboardingScreen from "../screens/OnboardingScreen";
import SignUpScreen from "../screens/SignUpScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import OnboardingFlowScreen from "../screens/OnboardingFlowScreen";
import MainTabs from "./MainTabs";
import AddContactScreen, { type ContactForm } from "../screens/AddContactScreen";
import ImportContactsScreen from "../screens/ImportContactsScreen";
import PeopleScreen from "../screens/PeopleScreen";
import RemindersScreen from "../screens/RemindersScreen";
import PersonDetailScreen from "../screens/PersonDetailScreen";
import ProfileSettingsScreen from "../screens/ProfileSettingsScreen";
import NotificationSettingsScreen from "../screens/NotificationSettingsScreen";
import PrivacySecurityScreen from "../screens/PrivacySecurityScreen";
import ManageSubscriptionScreen from "../screens/ManageSubscriptionScreen";
import BusinessCardScreen from "../screens/BusinessCardScreen";
import LegalScreen from "../screens/LegalScreen";
import ShuffleScreen from "../screens/ShuffleScreen";
import StoryScreen from "../screens/StoryScreen";
import { loadSettings } from "../data/userSettings";
import { colors } from "../theme/colors";

export type RootStackParamList = {
  Onboarding:              undefined;
  SignUp:                  undefined;
  Welcome:                 undefined;
  OnboardingFlow:          undefined;
  MainTabs:                undefined;
  AddContact:              undefined;
  ImportContacts:          undefined;
  People:                  { filter?: "all" | "reachOut" | "upcoming"; threshold?: number } | undefined;
  Reminders:               { filter?: "all" | "upcoming"; threshold?: number } | undefined;
  PersonDetail:            { contact: ContactForm };
  ProfileSettings:         undefined;
  NotificationSettings:    undefined;
  PrivacySecurity:         undefined;
  ManageSubscription:      undefined;
  BusinessCard:            undefined;
  Legal:                   { doc: "privacy" | "terms" };
  Shuffle:                 undefined;
  Story:                   undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<
    "Onboarding" | "MainTabs" | null
  >(null);

  useEffect(() => {
    loadSettings().then(s => {
      setInitialRoute(s.onboardingComplete ? "MainTabs" : "Onboarding");
    });
  }, []);

  if (initialRoute === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding"     component={OnboardingScreen} />
      <Stack.Screen name="SignUp"          component={SignUpScreen} />
      <Stack.Screen name="Welcome"          component={WelcomeScreen} />
      <Stack.Screen name="OnboardingFlow"  component={OnboardingFlowScreen} />
      <Stack.Screen name="MainTabs"        component={MainTabs} />
      <Stack.Screen name="AddContact"      component={AddContactScreen} />
      <Stack.Screen name="ImportContacts"  component={ImportContactsScreen} />
      <Stack.Screen name="People"          component={PeopleScreen} />
      <Stack.Screen name="Reminders"       component={RemindersScreen} />
      <Stack.Screen name="PersonDetail"         component={PersonDetailScreen} />
      <Stack.Screen name="ProfileSettings"      component={ProfileSettingsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="PrivacySecurity"      component={PrivacySecurityScreen} />
      <Stack.Screen name="ManageSubscription"   component={ManageSubscriptionScreen} />
      <Stack.Screen name="BusinessCard"          component={BusinessCardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Legal"                 component={LegalScreen} />
      <Stack.Screen name="Shuffle"               component={ShuffleScreen} options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="Story"                 component={StoryScreen} options={{ presentation: "fullScreenModal", animation: "fade" }} />
    </Stack.Navigator>
  );
}
